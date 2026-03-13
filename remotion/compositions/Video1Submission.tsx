import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { colors } from "../styles";
import {
  FadeIn,
  PhoneScreen,
  TitleScene,
  SectionTitle,
  MiniCard,
  MockCard,
  MockUpload,
  MockInput,
  MockButton,
  Badge,
} from "../components/common";

// 씬 1: 타이틀 (4초 = 120프레임)
const Scene1Title: React.FC = () => (
  <TitleScene
    step="스타트패키지 STEP 1"
    icon="📋"
    title={
      <>
        <span style={{ color: colors.gold }}>자료제출</span> 안내
      </>
    }
    subtitle={"서비스 시작을 위해\n아래 자료를 준비해주세요"}
  />
);

// 씬 2: 민감정보 서류 (4초)
const Scene2Sensitive: React.FC = () => (
  <PhoneScreen>
    <div style={{ flex: 1, padding: "60px 48px", overflow: "hidden" }}>
      <FadeIn delay={0}>
        <SectionTitle icon="🔒">민감정보 서류</SectionTitle>
      </FadeIn>
      <FadeIn delay={6}>
        <div style={{ marginBottom: 20 }}>
          <Badge color={colors.amber} bgColor={colors.amberBg}>
            ⚠ 서버 미저장 · 슬랙 직접 전송
          </Badge>
        </div>
      </FadeIn>
      <FadeIn delay={12}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <MiniCard icon="📄" label="사업자등록증" badge="필수" />
          <MiniCard icon="🪪" label="신분증" badge="필수" />
          <MiniCard icon="🏦" label="통장사본" badge="필수" />
        </div>
      </FadeIn>
      <FadeIn delay={20}>
        <MockCard variant="amber" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 30, color: colors.amber, lineHeight: 1.5 }}>
            보안을 위해 서버에 저장되지 않고
            <br />
            슬랙 채널로 직접 전송됩니다
          </div>
        </MockCard>
      </FadeIn>
      <FadeIn delay={28}>
        <MockUpload>
          📎 파일 업로드
          <br />
          <span style={{ fontSize: 24 }}>jpg, png, pdf (최대 10MB)</span>
        </MockUpload>
      </FadeIn>
      <FadeIn delay={36}>
        <MockUpload done>✅ 사업자등록증.pdf 업로드 완료</MockUpload>
      </FadeIn>
    </div>
  </PhoneScreen>
);

// 씬 3: 프로필·연락처 (5초)
const Scene3Profile: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <PhoneScreen>
      <div style={{ flex: 1, padding: "60px 48px", overflow: "hidden" }}>
        <FadeIn delay={0}>
          <SectionTitle icon="👤">프로필 · 연락처</SectionTitle>
        </FadeIn>
        <FadeIn delay={6}>
          <MockUpload done style={{ marginBottom: 20 }}>
            🖼️ 프로필 사진 업로드 완료
          </MockUpload>
        </FadeIn>
        <FadeIn delay={14}>
          <MockInput value="퓨처인테리어" filled />
        </FadeIn>
        <FadeIn delay={22}>
          <MockInput value="interior@naver.com" filled />
        </FadeIn>
        <FadeIn delay={30}>
          <MockInput value="010-1234-5678" filled />
        </FadeIn>
        <FadeIn delay={40}>
          <div style={{ marginTop: 24 }}>
            <SectionTitle icon="💳">계좌정보</SectionTitle>
            <div style={{ display: "flex", gap: 12 }}>
              <MockInput value="국민은행" filled style={{ flex: 1 }} />
              <MockInput value="123-456-789012" filled style={{ flex: 2 }} />
            </div>
            <MockInput value="홍길동" filled />
          </div>
        </FadeIn>
      </div>
    </PhoneScreen>
  );
};

// 씬 4: 디자인 정보 (4초)
const Scene4Design: React.FC = () => {
  const styleColors = [
    "linear-gradient(135deg, #1a3a5c, #2a5a8c)",
    "linear-gradient(135deg, #2d4a2d, #4a7a4a)",
    "linear-gradient(135deg, #4a3a2d, #7a6a4d)",
    "linear-gradient(135deg, #3a2a4a, #5a4a7a)",
    "linear-gradient(135deg, #4a2a2a, #7a4a4a)",
    "linear-gradient(135deg, #2a3a4a, #4a5a7a)",
  ];
  return (
    <PhoneScreen>
      <div style={{ flex: 1, padding: "60px 48px", overflow: "hidden" }}>
        <FadeIn delay={0}>
          <SectionTitle icon="🎨">디자인 정보</SectionTitle>
        </FadeIn>
        <FadeIn delay={4}>
          <div
            style={{ fontSize: 28, color: colors.textSub, marginBottom: 20 }}
          >
            원하시는 홈페이지 스타일을 선택해주세요
          </div>
        </FadeIn>
        <FadeIn delay={10}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              marginBottom: 28,
            }}
          >
            {styleColors.map((bg, i) => (
              <div
                key={i}
                style={{
                  background: "#2a2a2a",
                  border:
                    i === 1
                      ? "3px solid #3b82f6"
                      : "3px solid rgba(255,255,255,0.06)",
                  borderRadius: 20,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div style={{ width: "100%", height: 100, background: bg }} />
                <div
                  style={{
                    fontSize: 24,
                    padding: 12,
                    textAlign: "center",
                    color: "#aaa",
                  }}
                >
                  스타일 {i + 1}
                </div>
                {i === 1 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: colors.blue,
                      color: "#fff",
                      fontSize: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    ✓
                  </div>
                )}
              </div>
            ))}
          </div>
        </FadeIn>
        <FadeIn delay={20}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 20,
                background: colors.blue,
                border: "3px solid rgba(255,255,255,0.15)",
              }}
            />
            <span
              style={{ fontFamily: "monospace", fontSize: 30, color: "#aaa" }}
            >
              #3B82F6
            </span>
            <span style={{ fontSize: 28, color: colors.textSub }}>
              브랜드 컬러
            </span>
          </div>
        </FadeIn>
        <FadeIn delay={28}>
          <MockUpload done>🖼️ 로고파일 업로드 완료</MockUpload>
        </FadeIn>
        <FadeIn delay={34}>
          <MockUpload done>🖼️ 블로그 참고디자인 업로드 완료</MockUpload>
        </FadeIn>
      </div>
    </PhoneScreen>
  );
};

// 씬 5: 제출 완료 (3초)
const Scene5Complete: React.FC = () => (
  <PhoneScreen>
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 60px",
      }}
    >
      <FadeIn delay={0} slideY={0}>
        <MockCard
          variant="green"
          style={{ textAlign: "center", padding: "56px 32px" }}
        >
          <div style={{ fontSize: 100, marginBottom: 24 }}>✅</div>
          <div style={{ fontSize: 50, fontWeight: 800, color: colors.green }}>
            자료 제출 완료
          </div>
          <div style={{ fontSize: 32, color: colors.textSub, marginTop: 16 }}>
            모든 필수 자료가 제출되었습니다
          </div>
        </MockCard>
      </FadeIn>
      <FadeIn delay={15}>
        <MockCard
          style={{
            marginTop: 32,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 32, color: colors.green, fontWeight: 600 }}>
            ✓ 제출 완료
          </span>
          <MockButton
            variant="blue"
            style={{ margin: 0, padding: "16px 32px", fontSize: 28 }}
          >
            수정하기
          </MockButton>
        </MockCard>
      </FadeIn>
      <FadeIn delay={25}>
        <div style={{ marginTop: 48, textAlign: "center" }}>
          <div style={{ fontSize: 32, color: colors.textSub }}>다음 단계</div>
          <div
            style={{
              fontSize: 42,
              fontWeight: 700,
              color: colors.gold,
              marginTop: 8,
            }}
          >
            시안 제작이 시작됩니다 →
          </div>
        </div>
      </FadeIn>
    </div>
  </PhoneScreen>
);

// 메인 Composition
export const Video1Submission: React.FC = () => {
  // 30fps 기준: 4초=120f, 5초=150f, 3초=90f
  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      <Sequence from={0} durationInFrames={120} name="타이틀">
        <Scene1Title />
      </Sequence>
      <Sequence from={120} durationInFrames={120} name="민감정보 서류">
        <Scene2Sensitive />
      </Sequence>
      <Sequence from={240} durationInFrames={150} name="프로필·연락처">
        <Scene3Profile />
      </Sequence>
      <Sequence from={390} durationInFrames={120} name="디자인 정보">
        <Scene4Design />
      </Sequence>
      <Sequence from={510} durationInFrames={90} name="제출 완료">
        <Scene5Complete />
      </Sequence>
    </AbsoluteFill>
  );
};
