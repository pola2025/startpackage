"use client";

interface ProgressVisualizationProps {
  logoStatus: "idle" | "working" | "ready";
  printConnected: boolean;
  webConnected: boolean;
  adConnected: boolean;
  printPercent: number;
  webPercent: number;
  printFilled: number;
  printTotal: number;
  webFilled: number;
  webTotal: number;
}

const LOGO_STATUS_TEXT: Record<
  ProgressVisualizationProps["logoStatus"],
  string
> = {
  idle: "제작요청 대기",
  working: "디자이너 작업중",
  ready: "로고 준비완료",
};
const LOGO_STATUS_COLOR: Record<
  ProgressVisualizationProps["logoStatus"],
  string
> = {
  idle: "#94a3b8",
  working: "#fbbf24",
  ready: "#10b981",
};

export default function ProgressVisualization({
  logoStatus,
  printConnected,
  webConnected,
  adConnected,
  printPercent,
  webPercent,
  printFilled,
  printTotal,
  webFilled,
  webTotal,
}: ProgressVisualizationProps) {
  const wrapperClasses = [
    `state-${logoStatus}`,
    printConnected && "connect-print",
    webConnected && "connect-web",
    adConnected && "connect-ad",
  ]
    .filter(Boolean)
    .join(" ");

  const printBarWidth = (Math.min(100, Math.max(0, printPercent)) / 100) * 380;
  const webBarWidth = (Math.min(100, Math.max(0, webPercent)) / 100) * 380;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 lg:p-8">
      <style jsx>{`
        .pv-root :global(.led-blink) {
          animation: pvLedBlink 1.4s ease-in-out infinite;
        }
        .pv-root :global(.led-blink-2) {
          animation: pvLedBlink 1.6s ease-in-out infinite 0.4s;
        }
        @keyframes pvLedBlink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.25;
          }
        }
        .pv-root :global(.robot-breathe) {
          animation: pvBreathe 2.4s ease-in-out infinite;
          transform-origin: center bottom;
          transform-box: fill-box;
        }
        @keyframes pvBreathe {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-1.2px);
          }
        }
        .pv-root :global(.arm-tap) {
          animation: pvArmTap 0.55s ease-in-out infinite;
          transform-origin: top center;
          transform-box: fill-box;
        }
        .pv-root :global(.arm-tap-slow) {
          animation: pvArmTap 0.9s ease-in-out infinite;
          transform-origin: top center;
          transform-box: fill-box;
        }
        @keyframes pvArmTap {
          0%,
          100% {
            transform: translateY(0) rotate(0);
          }
          50% {
            transform: translateY(1.5px) rotate(2deg);
          }
        }
        .pv-root :global(.tiny-gear) {
          animation: pvRotate 6s linear infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        .pv-root :global(.tiny-gear-rev) {
          animation: pvRotateRev 8s linear infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        @keyframes pvRotate {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes pvRotateRev {
          to {
            transform: rotate(-360deg);
          }
        }
        .pv-root :global(.draw-line) {
          stroke-dasharray: 30;
          stroke-dashoffset: 30;
          animation: pvDrawLine 3.5s ease-in-out infinite;
        }
        @keyframes pvDrawLine {
          0% {
            stroke-dashoffset: 30;
            opacity: 1;
          }
          50% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          80% {
            stroke-dashoffset: 0;
            opacity: 0.5;
          }
          100% {
            stroke-dashoffset: 30;
            opacity: 0;
          }
        }
        .pv-root :global(.energy-flow) {
          stroke-dasharray: 6 8;
          animation: pvFlowDash 1.4s linear infinite;
        }
        @keyframes pvFlowDash {
          to {
            stroke-dashoffset: -28;
          }
        }
        .pv-root :global(.tease-circle) {
          animation: pvTeaseIn 1.6s ease-in-out infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        @keyframes pvTeaseIn {
          0% {
            opacity: 0;
            transform: translateX(0);
          }
          25% {
            opacity: 1;
            transform: translateX(2px);
          }
          60% {
            opacity: 1;
            transform: translateX(18px);
          }
          85% {
            opacity: 0.4;
            transform: translateX(26px);
          }
          100% {
            opacity: 0;
            transform: translateX(28px);
          }
        }
        .pv-root.state-idle :global(.logo-workshop) {
          filter: grayscale(100%) brightness(0.85);
          opacity: 0.6;
        }
        .pv-root.state-idle :global(.led-blink),
        .pv-root.state-idle :global(.led-blink-2),
        .pv-root.state-idle :global(.robot-breathe),
        .pv-root.state-idle :global(.arm-tap),
        .pv-root.state-idle :global(.arm-tap-slow),
        .pv-root.state-idle :global(.tiny-gear),
        .pv-root.state-idle :global(.tiny-gear-rev),
        .pv-root.state-idle :global(.draw-line) {
          animation-play-state: paused;
          opacity: 0.5;
        }
        .pv-root.state-working :global(.logo-workshop) {
          filter: grayscale(85%);
        }
        .pv-root.state-ready :global(.logo-workshop) {
          filter: none;
        }
        .pv-root.state-ready :global(.led-blink),
        .pv-root.state-ready :global(.led-blink-2),
        .pv-root.state-ready :global(.robot-breathe),
        .pv-root.state-ready :global(.arm-tap),
        .pv-root.state-ready :global(.arm-tap-slow),
        .pv-root.state-ready :global(.tiny-gear),
        .pv-root.state-ready :global(.tiny-gear-rev),
        .pv-root.state-ready :global(.draw-line) {
          animation-play-state: paused;
        }
        .pv-root.state-ready :global(.draw-line) {
          stroke-dashoffset: 0 !important;
          opacity: 1 !important;
        }
        .pv-root :global(.tease-print),
        .pv-root :global(.tease-web),
        .pv-root :global(.tease-ad) {
          display: none;
        }
        .pv-root.state-ready :global(.tease-print),
        .pv-root.state-ready :global(.tease-web),
        .pv-root.state-ready :global(.tease-ad) {
          display: block;
        }
        .pv-root.connect-print :global(.tease-print),
        .pv-root.connect-web :global(.tease-web),
        .pv-root.connect-ad :global(.tease-ad) {
          display: none;
        }
        .pv-root :global(.pipe-print .flow-line),
        .pv-root :global(.pipe-web .flow-line),
        .pv-root :global(.pipe-ad .flow-line) {
          display: none;
        }
        .pv-root :global(.pipe-print .base-line),
        .pv-root :global(.pipe-web .base-line),
        .pv-root :global(.pipe-ad .base-line) {
          stroke-dasharray: 6 6;
        }
        .pv-root.state-idle :global(.pipe-print),
        .pv-root.state-idle :global(.pipe-web),
        .pv-root.state-idle :global(.pipe-ad),
        .pv-root.state-working :global(.pipe-print),
        .pv-root.state-working :global(.pipe-web),
        .pv-root.state-working :global(.pipe-ad) {
          opacity: 0.35;
        }
        .pv-root.connect-print :global(.pipe-print .flow-line) {
          display: block;
        }
        .pv-root.connect-print :global(.pipe-print .base-line) {
          stroke-dasharray: 0;
        }
        .pv-root.connect-web :global(.pipe-web .flow-line) {
          display: block;
        }
        .pv-root.connect-web :global(.pipe-web .base-line) {
          stroke-dasharray: 0;
        }
        .pv-root.connect-ad :global(.pipe-ad .flow-line) {
          display: block;
        }
        .pv-root.connect-ad :global(.pipe-ad .base-line) {
          stroke-dasharray: 0;
        }
        .pv-root :global(.result-print),
        .pv-root :global(.result-web),
        .pv-root :global(.result-ad) {
          filter: grayscale(100%) brightness(0.95);
          opacity: 0.7;
          transition:
            filter 0.5s,
            opacity 0.5s;
        }
        .pv-root.connect-print :global(.result-print),
        .pv-root.connect-web :global(.result-web),
        .pv-root.connect-ad :global(.result-ad) {
          filter: none;
          opacity: 1;
        }
        .pv-root.state-idle :global(.result-print),
        .pv-root.state-idle :global(.result-web),
        .pv-root.state-idle :global(.result-ad),
        .pv-root.state-working :global(.result-print),
        .pv-root.state-working :global(.result-web),
        .pv-root.state-working :global(.result-ad) {
          opacity: 0.5;
        }
      `}</style>

      <div className={`pv-root ${wrapperClasses}`}>
        {/* 데스크탑 SVG */}
        <svg viewBox="0 0 940 540" className="w-full hidden lg:block">
          {/* 로고 제작 박스 */}
          <g className="logo-workshop" transform="translate(40, 170)">
            <rect
              x="0"
              y="0"
              width="220"
              height="200"
              rx="20"
              fill="#1e3a5f"
              stroke="#10b981"
              strokeWidth="4"
            />
            <rect
              x="60"
              y="14"
              width="100"
              height="6"
              rx="1"
              fill="#fbbf24"
              opacity="0.9"
            />
            <line
              x1="80"
              y1="22"
              x2="80"
              y2="32"
              stroke="#fbbf24"
              strokeWidth="1"
              opacity="0.4"
            />
            <line
              x1="110"
              y1="22"
              x2="110"
              y2="34"
              stroke="#fbbf24"
              strokeWidth="1"
              opacity="0.3"
            />
            <line
              x1="140"
              y1="22"
              x2="140"
              y2="32"
              stroke="#fbbf24"
              strokeWidth="1"
              opacity="0.4"
            />
            <rect
              x="20"
              y="155"
              width="180"
              height="10"
              rx="2"
              fill="#334155"
            />
            <rect
              x="80"
              y="100"
              width="80"
              height="55"
              rx="3"
              fill="white"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />
            <line
              x1="92"
              y1="115"
              x2="148"
              y2="115"
              stroke="#1e3a5f"
              strokeWidth="2"
              strokeLinecap="round"
              className="draw-line"
            />
            <line
              x1="92"
              y1="125"
              x2="135"
              y2="125"
              stroke="#1e3a5f"
              strokeWidth="2"
              strokeLinecap="round"
              className="draw-line"
              style={{ animationDelay: "0.8s" }}
            />
            <text
              x="120"
              y="148"
              textAnchor="middle"
              fill="#1e3a5f"
              fontSize="11"
              fontWeight="800"
            >
              LOGO
            </text>
            {/* 로봇 1 */}
            <g className="robot-breathe" transform="translate(45, 110)">
              <rect x="-8" y="36" width="16" height="6" rx="1" fill="#475569" />
              <rect
                x="-9"
                y="14"
                width="18"
                height="22"
                rx="3"
                fill="#10b981"
                stroke="#047857"
                strokeWidth="1"
              />
              <circle
                cx="0"
                cy="22"
                r="1.5"
                fill="#fbbf24"
                className="led-blink"
              />
              <rect
                x="-7"
                y="0"
                width="14"
                height="14"
                rx="3"
                fill="#cbd5e1"
                stroke="#475569"
                strokeWidth="1"
              />
              <circle cx="-3" cy="6" r="1" fill="#1e293b" />
              <circle cx="3" cy="6" r="1" fill="#1e293b" />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="-5"
                stroke="#475569"
                strokeWidth="1"
              />
              <circle
                cx="0"
                cy="-6"
                r="1.2"
                fill="#10b981"
                className="led-blink"
              />
              <g className="arm-tap" transform="translate(8, 16)">
                <line
                  x1="0"
                  y1="0"
                  x2="14"
                  y2="6"
                  stroke="#475569"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <line
                  x1="14"
                  y1="6"
                  x2="22"
                  y2="2"
                  stroke="#1e3a5f"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx="22" cy="2" r="1" fill="#fbbf24" />
              </g>
            </g>
            {/* 로봇 2 */}
            <g
              className="robot-breathe"
              transform="translate(180, 115)"
              style={{ animationDelay: "0.6s" }}
            >
              <rect x="-8" y="32" width="16" height="6" rx="1" fill="#475569" />
              <rect
                x="-9"
                y="10"
                width="18"
                height="22"
                rx="3"
                fill="#1e3a5f"
                stroke="#0f172a"
                strokeWidth="1"
              />
              <rect x="-6" y="14" width="12" height="9" rx="1" fill="#10b981" />
              <line
                x1="-4"
                y1="17"
                x2="4"
                y2="17"
                stroke="white"
                strokeWidth="0.8"
              />
              <rect
                x="-7"
                y="-4"
                width="14"
                height="14"
                rx="3"
                fill="#cbd5e1"
                stroke="#475569"
                strokeWidth="1"
              />
              <rect
                x="-4"
                y="1"
                width="8"
                height="2"
                rx="1"
                fill="#10b981"
                className="led-blink-2"
              />
              <line
                x1="0"
                y1="-4"
                x2="0"
                y2="-9"
                stroke="#475569"
                strokeWidth="1"
              />
              <circle
                cx="0"
                cy="-10"
                r="1.2"
                fill="#fbbf24"
                className="led-blink-2"
              />
              <g className="arm-tap-slow" transform="translate(-8, 14)">
                <line
                  x1="0"
                  y1="0"
                  x2="-12"
                  y2="-2"
                  stroke="#475569"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </g>
            </g>
            {/* 톱니 */}
            <g className="tiny-gear" transform="translate(195, 30)">
              <circle
                cx="0"
                cy="0"
                r="8"
                fill="none"
                stroke="#10b981"
                strokeWidth="1.5"
                opacity="0.6"
              />
              <g fill="#10b981" opacity="0.6">
                <rect x="-1" y="-11" width="2" height="3" />
                <rect x="-1" y="8" width="2" height="3" />
                <rect x="-11" y="-1" width="3" height="2" />
                <rect x="8" y="-1" width="3" height="2" />
              </g>
              <circle cx="0" cy="0" r="2" fill="#10b981" opacity="0.6" />
            </g>
            <g className="tiny-gear-rev" transform="translate(208, 48)">
              <circle
                cx="0"
                cy="0"
                r="5"
                fill="none"
                stroke="#10b981"
                strokeWidth="1"
                opacity="0.5"
              />
              <g fill="#10b981" opacity="0.5">
                <rect x="-0.5" y="-7" width="1" height="2" />
                <rect x="-0.5" y="5" width="1" height="2" />
                <rect x="-7" y="-0.5" width="2" height="1" />
                <rect x="5" y="-0.5" width="2" height="1" />
              </g>
            </g>
            <text
              x="110"
              y="-15"
              textAnchor="middle"
              fill="#0f172a"
              fontSize="20"
              fontWeight="800"
            >
              로고 제작
            </text>
          </g>

          {/* 파이프 */}
          <g className="pipe-print">
            <path
              className="base-line"
              d="M 260 230 Q 370 230 480 100"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <path
              className="flow-line energy-flow"
              d="M 260 230 Q 370 230 480 100"
              fill="none"
              stroke="#10b981"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </g>
          <g className="pipe-web">
            <path
              className="base-line"
              d="M 260 270 L 480 270"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <path
              className="flow-line energy-flow"
              d="M 260 270 L 480 270"
              fill="none"
              stroke="#10b981"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </g>
          <g className="pipe-ad">
            <path
              className="base-line"
              d="M 260 310 Q 370 310 480 440"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <path
              className="flow-line energy-flow"
              d="M 260 310 Q 370 310 480 440"
              fill="none"
              stroke="#10b981"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </g>

          {/* 인쇄물 박스 */}
          <g className="result-print" transform="translate(480, 30)">
            <rect
              x="0"
              y="0"
              width="420"
              height="140"
              rx="14"
              fill="white"
              stroke="#10b981"
              strokeWidth="3"
            />
            <text x="20" y="38" fill="#0f172a" fontSize="20" fontWeight="800">
              📦 인쇄물
            </text>
            <text x="20" y="60" fill="#64748b" fontSize="13">
              정보 {printFilled} / {printTotal} 항목
            </text>
            <rect
              x="20"
              y="100"
              width="380"
              height="20"
              rx="10"
              fill="#f1f5f9"
            />
            <rect
              x="20"
              y="100"
              width={printBarWidth}
              height="20"
              rx="10"
              fill="#10b981"
            />
            <text
              x="400"
              y="115"
              textAnchor="end"
              fill="#0f172a"
              fontSize="14"
              fontWeight="800"
            >
              {printPercent}%
            </text>
          </g>
          <g className="tease-print">
            <circle
              cx="263"
              cy="230"
              r="5"
              fill="#10b981"
              className="tease-circle"
            />
            <circle
              cx="263"
              cy="230"
              r="3.5"
              fill="#10b981"
              opacity="0.6"
              className="tease-circle"
              style={{ animationDelay: "0.6s" }}
            />
          </g>

          {/* 홈페이지 박스 */}
          <g className="result-web" transform="translate(480, 200)">
            <rect
              x="0"
              y="0"
              width="420"
              height="140"
              rx="14"
              fill="white"
              stroke="#10b981"
              strokeWidth="3"
            />
            <text x="20" y="38" fill="#0f172a" fontSize="20" fontWeight="800">
              🖥️ 홈페이지
            </text>
            <text x="20" y="60" fill="#64748b" fontSize="13">
              정보 {webFilled} / {webTotal} 항목 {webConnected ? "✓" : ""}
            </text>
            <rect
              x="20"
              y="100"
              width="380"
              height="20"
              rx="10"
              fill="#f1f5f9"
            />
            <rect
              x="20"
              y="100"
              width={webBarWidth}
              height="20"
              rx="10"
              fill="#10b981"
            />
            <text
              x="400"
              y="115"
              textAnchor="end"
              fill="#0f172a"
              fontSize="14"
              fontWeight="800"
            >
              {webPercent}%
            </text>
          </g>
          <g className="tease-web">
            <circle
              cx="263"
              cy="270"
              r="5"
              fill="#10b981"
              className="tease-circle"
            />
            <circle
              cx="263"
              cy="270"
              r="3.5"
              fill="#10b981"
              opacity="0.6"
              className="tease-circle"
              style={{ animationDelay: "0.6s" }}
            />
          </g>

          {/* 광고 박스 */}
          <g className="result-ad" transform="translate(480, 370)">
            <rect
              x="0"
              y="0"
              width="420"
              height="140"
              rx="14"
              fill="white"
              stroke="#cbd5e1"
              strokeWidth="2"
              strokeDasharray="6,4"
            />
            <text x="20" y="38" fill="#64748b" fontSize="20" fontWeight="800">
              📢 Meta 광고
            </text>
            <text x="20" y="60" fill="#dc2626" fontSize="13" fontWeight="700">
              📞 전화·문자·문의로 직접 신청 필수
            </text>
            <text x="20" y="98" fill="#475569" fontSize="12">
              직접 신청 → 관리자 승인 → 라인 연결
            </text>
          </g>
          <g className="tease-ad">
            <circle
              cx="263"
              cy="310"
              r="5"
              fill="#10b981"
              className="tease-circle"
            />
            <circle
              cx="263"
              cy="310"
              r="3.5"
              fill="#10b981"
              opacity="0.6"
              className="tease-circle"
              style={{ animationDelay: "0.6s" }}
            />
          </g>
        </svg>

        {/* 모바일 SVG (단순화) */}
        <svg viewBox="0 0 360 700" className="w-full lg:hidden">
          <g className="logo-workshop" transform="translate(70, 10)">
            <rect
              x="0"
              y="0"
              width="220"
              height="200"
              rx="18"
              fill="#1e3a5f"
              stroke="#10b981"
              strokeWidth="4"
            />
            <rect
              x="60"
              y="14"
              width="100"
              height="6"
              rx="1"
              fill="#fbbf24"
              opacity="0.9"
            />
            <rect
              x="20"
              y="155"
              width="180"
              height="10"
              rx="2"
              fill="#334155"
            />
            <rect
              x="80"
              y="100"
              width="80"
              height="55"
              rx="3"
              fill="white"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />
            <text
              x="120"
              y="135"
              textAnchor="middle"
              fill="#1e3a5f"
              fontSize="14"
              fontWeight="800"
            >
              LOGO
            </text>
            <g className="robot-breathe" transform="translate(45, 110)">
              <rect
                x="-9"
                y="14"
                width="18"
                height="22"
                rx="3"
                fill="#10b981"
                stroke="#047857"
                strokeWidth="1"
              />
              <rect
                x="-7"
                y="0"
                width="14"
                height="14"
                rx="3"
                fill="#cbd5e1"
                stroke="#475569"
                strokeWidth="1"
              />
              <circle
                cx="0"
                cy="-6"
                r="1.2"
                fill="#10b981"
                className="led-blink"
              />
            </g>
            <text
              x="110"
              y="-12"
              textAnchor="middle"
              fill="#0f172a"
              fontSize="16"
              fontWeight="800"
            >
              로고 제작
            </text>
          </g>
          {/* 세로 파이프 */}
          <g className="pipe-print">
            <path
              className="base-line"
              d="M 180 210 L 90 280"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              className="flow-line energy-flow"
              d="M 180 210 L 90 280"
              fill="none"
              stroke="#10b981"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
          <g className="pipe-web">
            <path
              className="base-line"
              d="M 180 210 L 180 280"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              className="flow-line energy-flow"
              d="M 180 210 L 180 280"
              fill="none"
              stroke="#10b981"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
          <g className="pipe-ad">
            <path
              className="base-line"
              d="M 180 210 L 270 280"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              className="flow-line energy-flow"
              d="M 180 210 L 270 280"
              fill="none"
              stroke="#10b981"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </g>
          {/* 모바일 결과물 박스 (가로 3개) */}
          <g className="result-print" transform="translate(20, 290)">
            <rect
              x="0"
              y="0"
              width="100"
              height="100"
              rx="10"
              fill="white"
              stroke="#10b981"
              strokeWidth="2"
            />
            <text x="50" y="32" textAnchor="middle" fontSize="20">
              📦
            </text>
            <text
              x="50"
              y="55"
              textAnchor="middle"
              fontSize="11"
              fill="#0f172a"
              fontWeight="800"
            >
              인쇄물
            </text>
            <text
              x="50"
              y="78"
              textAnchor="middle"
              fontSize="11"
              fill="#64748b"
              fontWeight="800"
            >
              {printPercent}%
            </text>
          </g>
          <g className="result-web" transform="translate(130, 290)">
            <rect
              x="0"
              y="0"
              width="100"
              height="100"
              rx="10"
              fill="white"
              stroke="#10b981"
              strokeWidth="2"
            />
            <text x="50" y="32" textAnchor="middle" fontSize="20">
              🖥️
            </text>
            <text
              x="50"
              y="55"
              textAnchor="middle"
              fontSize="11"
              fill="#0f172a"
              fontWeight="800"
            >
              홈페이지
            </text>
            <text
              x="50"
              y="78"
              textAnchor="middle"
              fontSize="11"
              fill="#64748b"
              fontWeight="800"
            >
              {webPercent}%
            </text>
          </g>
          <g className="result-ad" transform="translate(240, 290)">
            <rect
              x="0"
              y="0"
              width="100"
              height="100"
              rx="10"
              fill="white"
              stroke="#cbd5e1"
              strokeWidth="2"
              strokeDasharray="6,4"
            />
            <text x="50" y="32" textAnchor="middle" fontSize="20">
              📢
            </text>
            <text
              x="50"
              y="55"
              textAnchor="middle"
              fontSize="11"
              fill="#64748b"
              fontWeight="800"
            >
              Meta 광고
            </text>
            <text
              x="50"
              y="78"
              textAnchor="middle"
              fontSize="9"
              fill="#dc2626"
              fontWeight="700"
            >
              직접 신청
            </text>
          </g>
          <g className="tease-print">
            <circle
              cx="180"
              cy="215"
              r="4"
              fill="#10b981"
              className="tease-circle"
            />
          </g>
          <g className="tease-web">
            <circle
              cx="180"
              cy="215"
              r="4"
              fill="#10b981"
              className="tease-circle"
              style={{ animationDelay: "0.3s" }}
            />
          </g>
          <g className="tease-ad">
            <circle
              cx="180"
              cy="215"
              r="4"
              fill="#10b981"
              className="tease-circle"
              style={{ animationDelay: "0.6s" }}
            />
          </g>
        </svg>

        {/* 로고 상태 라벨 */}
        <div className="mt-4 lg:mt-5 flex justify-start">
          <div
            className="px-5 py-3 rounded-xl text-center text-white shadow-md"
            style={{ background: LOGO_STATUS_COLOR[logoStatus], minWidth: 200 }}
          >
            <div className="text-[11px] opacity-90 font-semibold tracking-wide">
              로고 제작 상태
            </div>
            <div className="text-base lg:text-lg font-bold mt-0.5">
              {LOGO_STATUS_TEXT[logoStatus]}
            </div>
          </div>
        </div>

        <p className="text-[11px] lg:text-xs text-slate-500 mt-3">
          로고 = 동력원 · 결과물 입구의 깔짝거리는 에너지 = 정보 채우면 이쪽으로
          연결
        </p>
      </div>
    </section>
  );
}
