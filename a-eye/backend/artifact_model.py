from collections import OrderedDict
from typing import Any

import torch
from torch import nn
from torchvision.models import vit_b_16


class LoRALinear(nn.Module):
    def __init__(self, in_features: int, out_features: int, r: int = 32, alpha: int = 64, bias: bool = True) -> None:
        super().__init__()
        self.base = nn.Linear(in_features, out_features, bias=bias)
        self.lora_A = nn.Parameter(torch.zeros(r, in_features))
        self.lora_B = nn.Parameter(torch.zeros(out_features, r))
        self.scale = alpha / r

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.base(x) + torch.nn.functional.linear(
            torch.nn.functional.linear(x, self.lora_A),
            self.lora_B,
        ) * self.scale


class ViTEncoder(nn.Module):
    def __init__(self, dropout: float = 0.32) -> None:
        super().__init__()
        self.backbone = vit_b_16(weights=None)
        self.backbone.heads = nn.Identity()
        for layer in self.backbone.encoder.layers:
            layer.mlp[0] = LoRALinear(768, 3072)
            layer.mlp[3] = LoRALinear(3072, 768)
        self.head = nn.Sequential(
            nn.BatchNorm1d(768),
            nn.Dropout(dropout),
            nn.Linear(768, 2),
        )

    def features(self, x: torch.Tensor) -> torch.Tensor:
        return self.backbone(x)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.head(self.features(x))


class CLIPSelfAttention(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.k_proj = nn.Linear(768, 768)
        self.v_proj = LoRALinear(768, 768)
        self.q_proj = LoRALinear(768, 768)
        self.out_proj = nn.Linear(768, 768)
        self.num_heads = 12
        self.head_dim = 64
        self.scale = self.head_dim ** -0.5

    def forward(self, hidden_states: torch.Tensor) -> torch.Tensor:
        batch, tokens, _ = hidden_states.shape
        q = self.q_proj(hidden_states).view(batch, tokens, self.num_heads, self.head_dim).transpose(1, 2)
        k = self.k_proj(hidden_states).view(batch, tokens, self.num_heads, self.head_dim).transpose(1, 2)
        v = self.v_proj(hidden_states).view(batch, tokens, self.num_heads, self.head_dim).transpose(1, 2)
        attn = torch.softmax((q @ k.transpose(-2, -1)) * self.scale, dim=-1)
        out = (attn @ v).transpose(1, 2).reshape(batch, tokens, 768)
        return self.out_proj(out)


class CLIPEncoderLayer(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.self_attn = CLIPSelfAttention()
        self.layer_norm1 = nn.LayerNorm(768)
        self.mlp = nn.Module()
        self.mlp.fc1 = nn.Linear(768, 3072)
        self.mlp.fc2 = nn.Linear(3072, 768)
        self.layer_norm2 = nn.LayerNorm(768)
        self.activation = nn.GELU()

    def forward(self, hidden_states: torch.Tensor) -> torch.Tensor:
        hidden_states = hidden_states + self.self_attn(self.layer_norm1(hidden_states))
        mlp_out = self.mlp.fc2(self.activation(self.mlp.fc1(self.layer_norm2(hidden_states))))
        return hidden_states + mlp_out


class CLIPVisionInner(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.embeddings = nn.Module()
        self.embeddings.class_embedding = nn.Parameter(torch.zeros(768))
        self.embeddings.patch_embedding = nn.Conv2d(3, 768, kernel_size=32, stride=32, bias=False)
        self.embeddings.position_embedding = nn.Embedding(50, 768)
        self.pre_layrnorm = nn.LayerNorm(768)
        self.encoder = nn.Module()
        self.encoder.layers = nn.ModuleList([CLIPEncoderLayer() for _ in range(12)])
        self.post_layernorm = nn.LayerNorm(768)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        patch = self.embeddings.patch_embedding(x).flatten(2).transpose(1, 2)
        cls = self.embeddings.class_embedding.to(dtype=patch.dtype).expand(x.shape[0], 1, -1)
        hidden = torch.cat([cls, patch], dim=1)
        positions = torch.arange(hidden.shape[1], device=x.device).unsqueeze(0)
        hidden = hidden + self.embeddings.position_embedding(positions)
        hidden = self.pre_layrnorm(hidden)
        for layer in self.encoder.layers:
            hidden = layer(hidden)
        return self.post_layernorm(hidden[:, 0])


class CLIPVisionWithProjection(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.vision_model = CLIPVisionInner()
        self.visual_projection = nn.Linear(768, 512, bias=False)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.visual_projection(self.vision_model(x))


class CLIPEncoder(nn.Module):
    def __init__(self, dropout: float = 0.32) -> None:
        super().__init__()
        self.vision_model = CLIPVisionWithProjection()
        self.head = nn.Sequential(
            nn.BatchNorm1d(512),
            nn.Dropout(dropout),
            nn.Linear(512, 2),
        )

    def features(self, x: torch.Tensor) -> torch.Tensor:
        return self.vision_model(x)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.head(self.features(x))


class FFTBranch(nn.Module):
    def __init__(self, dropout: float = 0.10) -> None:
        super().__init__()
        self.conv = nn.Sequential(OrderedDict([
            ("0", nn.Conv2d(3, 32, 7, padding=3, bias=False)),
            ("1", nn.BatchNorm2d(32)),
            ("2", nn.ReLU(inplace=True)),
            ("3", nn.Conv2d(32, 64, 5, padding=2, bias=False)),
            ("4", nn.BatchNorm2d(64)),
            ("5", nn.ReLU(inplace=True)),
            ("6", nn.Conv2d(64, 128, 3, padding=1, bias=False)),
            ("7", nn.BatchNorm2d(128)),
            ("8", nn.ReLU(inplace=True)),
            ("9", nn.Conv2d(128, 128, 3, padding=1, bias=False)),
            ("10", nn.BatchNorm2d(128)),
            ("11", nn.ReLU(inplace=True)),
        ]))
        self.pool = nn.AdaptiveAvgPool2d((1, 1))
        self.proj = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(128, 256),
            nn.LayerNorm(256),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        fft = torch.fft.fft2(x, norm="ortho")
        mag = torch.log1p(torch.abs(torch.fft.fftshift(fft, dim=(-2, -1))))
        feat = self.pool(self.conv(mag)).flatten(1)
        return self.proj(feat)


class SRMBranch(nn.Module):
    def __init__(self, dropout: float = 0.10) -> None:
        super().__init__()
        self.register_buffer("clip_mean", torch.zeros(1, 3, 1, 1))
        self.register_buffer("clip_std", torch.ones(1, 3, 1, 1))
        self.highpass = nn.Conv2d(3, 18, 5, padding=2, bias=False)
        self.encoder = nn.Sequential(OrderedDict([
            ("0", nn.Conv2d(18, 48, 3, padding=1, bias=False)),
            ("1", nn.BatchNorm2d(48)),
            ("2", nn.ReLU(inplace=True)),
            ("3", nn.Conv2d(48, 96, 3, padding=1, bias=False)),
            ("4", nn.BatchNorm2d(96)),
            ("5", nn.ReLU(inplace=True)),
            ("6", nn.Conv2d(96, 128, 3, padding=1, bias=False)),
            ("7", nn.BatchNorm2d(128)),
            ("8", nn.ReLU(inplace=True)),
            ("9", nn.Conv2d(128, 128, 3, padding=1, bias=False)),
            ("10", nn.BatchNorm2d(128)),
            ("11", nn.ReLU(inplace=True)),
        ]))
        self.pool = nn.AdaptiveAvgPool2d((1, 1))
        self.proj = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(128, 128),
            nn.LayerNorm(128),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        normalized = (x - self.clip_mean) / self.clip_std.clamp_min(1e-6)
        residual = self.highpass(normalized)
        feat = self.pool(self.encoder(residual)).flatten(1)
        return self.proj(feat)


class ArtifactLoRAHybrid(nn.Module):
    expects_raw_input = True

    def __init__(self, dropout: float = 0.32) -> None:
        super().__init__()
        self.register_buffer("clip_mean", torch.zeros(1, 3, 1, 1))
        self.register_buffer("clip_std", torch.ones(1, 3, 1, 1))
        self.vit_encoder = ViTEncoder(dropout=dropout)
        self.clip_encoder = CLIPEncoder(dropout=dropout)
        self.fft_branch = FFTBranch()
        self.srm_branch = SRMBranch()
        self.head = nn.Sequential(
            nn.BatchNorm1d(1664),
            nn.Linear(1664, 832),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
            nn.Linear(832, 416),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
            nn.Linear(416, 2),
        )
        self.register_buffer("imagenet_mean", torch.tensor([0.485, 0.456, 0.406]).view(1, 3, 1, 1), persistent=False)
        self.register_buffer("imagenet_std", torch.tensor([0.229, 0.224, 0.225]).view(1, 3, 1, 1), persistent=False)

    def _branch_features(self, x: torch.Tensor):
        raw = x.clamp(0, 1)
        vit_x = (raw - self.imagenet_mean) / self.imagenet_std
        clip_x = (raw - self.clip_mean) / self.clip_std.clamp_min(1e-6)
        vit_feat = self.vit_encoder.features(vit_x)
        clip_feat = self.clip_encoder.features(clip_x)
        fft_feat = self.fft_branch(raw)
        srm_feat = self.srm_branch(raw)
        return vit_feat, clip_feat, fft_feat, srm_feat

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        vit_feat, clip_feat, fft_feat, srm_feat = self._branch_features(x)
        return self.head(torch.cat([vit_feat, clip_feat, fft_feat, srm_feat], dim=1))

    def forward_breakdown(self, x: torch.Tensor):
        """최종 로짓과 함께 각 관점별(구조/맥락/디테일) 실제 로짓을 반환합니다.

        - structure: ViT 인코더의 자체 분류 헤드 (전역 구조/형태)
        - context:  CLIP 인코더의 자체 분류 헤드 (의미적 맥락)
        - detail:   주파수(FFT)+노이즈(SRM) 브랜치만 통과시킨 메인 헤드 (질감/흔적)

        모두 학습된 가중치를 사용하는 실제 추론 결과이며, 임의 값이 아닙니다.
        """
        vit_feat, clip_feat, fft_feat, srm_feat = self._branch_features(x)
        final_logits = self.head(torch.cat([vit_feat, clip_feat, fft_feat, srm_feat], dim=1))

        structure_logits = self.vit_encoder.head(vit_feat)
        context_logits = self.clip_encoder.head(clip_feat)
        # 디테일 관점: 구조/맥락 특징을 0으로 두고 주파수·노이즈 특징만으로 판단
        detail_logits = self.head(
            torch.cat([torch.zeros_like(vit_feat), torch.zeros_like(clip_feat), fft_feat, srm_feat], dim=1)
        )
        return final_logits, {
            "structure": structure_logits,
            "context": context_logits,
            "detail": detail_logits,
        }


def build_artifact_lora_hybrid() -> ArtifactLoRAHybrid:
    return ArtifactLoRAHybrid()


def is_artifact_lora_state_dict(state_dict: dict[str, Any]) -> bool:
    return (
        "vit_encoder.backbone.class_token" in state_dict
        and "clip_encoder.vision_model.visual_projection.weight" in state_dict
        and "fft_branch.proj.1.weight" in state_dict
        and "srm_branch.highpass.weight" in state_dict
        and "head.7.weight" in state_dict
    )
