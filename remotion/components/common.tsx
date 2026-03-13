import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, fonts } from "../styles";

// 페이드인 + 슬라이드업 래퍼
export const FadeIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  slideY?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, slideY = 30, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 120 },
  });
  return (
    <div
      style={{
        opacity: interpolate(progress, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(progress, [0, 1], [slideY, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// 폰 화면 배경
export const PhoneScreen: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <div
    style={{
      width: 1080,
      height: 1920,
      background: colors.bg,
      fontFamily: fonts.main,
      color: colors.text,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      position: "relative",
    }}
  >
    {children}
  </div>
);

// 타이틀 씬 공통
export const TitleScene: React.FC<{
  step?: string;
  icon: string;
  title: React.ReactNode;
  subtitle: string;
  iconBorderColor?: string;
  iconBgColor?: string;
}> = ({
  step,
  icon,
  title,
  subtitle,
  iconBorderColor = colors.goldBorder,
  iconBgColor = colors.goldBg,
}) => {
  return (
    <PhoneScreen>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 40,
          padding: "0 80px",
        }}
      >
        {step && (
          <FadeIn delay={5}>
            <div
              style={{
                display: "inline-flex",
                padding: "16px 40px",
                borderRadius: 50,
                background: colors.goldBg,
                border: `2px solid ${colors.goldBorder}`,
                color: colors.gold,
                fontSize: 32,
                fontWeight: 600,
              }}
            >
              {step}
            </div>
          </FadeIn>
        )}
        <FadeIn delay={12}>
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: "50%",
              background: iconBgColor,
              border: `4px solid ${iconBorderColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 80,
            }}
          >
            {icon}
          </div>
        </FadeIn>
        <FadeIn delay={18}>
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              lineHeight: 1.3,
            }}
          >
            {title}
          </div>
        </FadeIn>
        <FadeIn delay={24}>
          <div
            style={{
              fontSize: 40,
              color: colors.textSub,
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </div>
        </FadeIn>
      </div>
    </PhoneScreen>
  );
};

// 목업 카드
export const MockCard: React.FC<{
  children: React.ReactNode;
  variant?:
    | "default"
    | "amber"
    | "green"
    | "blue"
    | "orange"
    | "gold-outline"
    | "red-outline";
  style?: React.CSSProperties;
}> = ({ children, variant = "default", style }) => {
  const bgMap: Record<string, string> = {
    default: colors.card,
    amber: colors.amberBg,
    green: colors.greenBg,
    blue: colors.blueBg,
    orange: colors.orangeBg,
    "gold-outline": "rgba(201,169,98,0.08)",
    "red-outline": colors.redBg,
  };
  const borderMap: Record<string, string> = {
    default: colors.cardBorder,
    amber: colors.amberBorder,
    green: colors.greenBorder,
    blue: colors.blueBorder,
    orange: colors.orangeBorder,
    "gold-outline": "rgba(201,169,98,0.4)",
    "red-outline": "rgba(239,68,68,0.4)",
  };
  return (
    <div
      style={{
        background: bgMap[variant],
        border: `2px solid ${borderMap[variant]}`,
        borderRadius: 28,
        padding: "36px 32px",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// 뱃지
export const Badge: React.FC<{
  children: React.ReactNode;
  color?: string;
  bgColor?: string;
}> = ({ children, color = colors.gold, bgColor = "rgba(201,169,98,0.15)" }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 24px",
      borderRadius: 24,
      fontSize: 26,
      fontWeight: 600,
      color,
      background: bgColor,
    }}
  >
    {children}
  </span>
);

// 목업 입력 필드
export const MockInput: React.FC<{
  value: string;
  filled?: boolean;
  style?: React.CSSProperties;
}> = ({ value, filled = false, style }) => (
  <div
    style={{
      background: "#2a2a2a",
      border: `2px solid ${filled ? colors.goldBorder : colors.cardBorder}`,
      borderRadius: 20,
      padding: "28px 32px",
      color: filled ? "#ddd" : colors.textMuted,
      fontSize: 32,
      marginBottom: 16,
      ...style,
    }}
  >
    {value}
  </div>
);

// 섹션 타이틀
export const SectionTitle: React.FC<{
  icon: string;
  children: React.ReactNode;
}> = ({ icon, children }) => (
  <div
    style={{
      fontSize: 42,
      fontWeight: 700,
      display: "flex",
      alignItems: "center",
      gap: 16,
      marginBottom: 28,
    }}
  >
    <span style={{ fontSize: 46 }}>{icon}</span>
    {children}
  </div>
);

// 미니 카드 (3열 그리드용)
export const MiniCard: React.FC<{
  icon: string;
  label: string;
  badge?: string;
}> = ({ icon, label, badge }) => (
  <div
    style={{
      background: colors.card,
      border: `2px solid ${colors.cardBorder}`,
      borderRadius: 20,
      padding: "28px 16px",
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: 50, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: 28, fontWeight: 600, color: "#ccc" }}>{label}</div>
    {badge && (
      <div style={{ fontSize: 24, color: colors.amber, marginTop: 4 }}>
        {badge}
      </div>
    )}
  </div>
);

// 업로드 목업
export const MockUpload: React.FC<{
  children: React.ReactNode;
  done?: boolean;
  style?: React.CSSProperties;
}> = ({ children, done = false, style }) => (
  <div
    style={{
      border: done
        ? `3px solid rgba(34,197,94,0.4)`
        : `3px dashed rgba(255,255,255,0.12)`,
      borderRadius: 24,
      padding: "32px 24px",
      textAlign: "center",
      fontSize: 30,
      color: done ? colors.green : "#666",
      background: done ? "rgba(34,197,94,0.05)" : "transparent",
      marginBottom: 16,
      ...style,
    }}
  >
    {children}
  </div>
);

// 골드 버튼 목업
export const MockButton: React.FC<{
  children: React.ReactNode;
  variant?: "gold" | "green" | "blue" | "orange" | "outline";
  style?: React.CSSProperties;
}> = ({ children, variant = "gold", style }) => {
  const styles: Record<string, React.CSSProperties> = {
    gold: {
      background: "linear-gradient(135deg, #c9a962, #b08d3e)",
      color: "#1a1a1a",
    },
    green: { background: "#22c55e", color: "#fff" },
    blue: { background: "#3b82f6", color: "#fff" },
    orange: { background: "#f97316", color: "#fff" },
    outline: {
      background: "transparent",
      border: "3px solid rgba(255,255,255,0.15)",
      color: "#ccc",
    },
  };
  return (
    <div
      style={{
        padding: "32px 44px",
        borderRadius: 24,
        textAlign: "center",
        fontSize: 36,
        fontWeight: 700,
        ...styles[variant],
        ...style,
      }}
    >
      {children}
    </div>
  );
};
