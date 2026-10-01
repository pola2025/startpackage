"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { HomepageStyleOption } from "@/lib/homepage-styles";
import styles from "./homepage-style-explorer.module.css";

type ViewportMode = "desktop" | "mobile";
type FrameStatus = "loading" | "responded" | "failed";
type ExplorerStyleOption = HomepageStyleOption & {
  previewUrl?: string;
  description?: string;
  pageCount?: number;
  category?: "current" | "new";
  previewImage?: string;
  previewImageMobile?: string;
  localSnapshotFallback?: boolean;
};

export interface HomepageStyleExplorerProps {
  options: HomepageStyleOption[];
  value?: string;
  onSelect?: (url: string) => void;
  disabled?: boolean;
}

function getDefaultUrl(options: HomepageStyleOption[], value?: string) {
  if (value && options.some((option) => option.url === value)) return value;
  const firstNew = options.find(
    (option) => (option as ExplorerStyleOption).category === "new",
  );
  return firstNew?.url || options[0]?.url || "";
}

export function HomepageStyleExplorer({
  options,
  value,
  onSelect,
  disabled = false,
}: HomepageStyleExplorerProps) {
  const instanceId = useId();
  const [activeUrl, setActiveUrl] = useState(() =>
    getDefaultUrl(options, value),
  );
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [reloadKey, setReloadKey] = useState(0);
  const [frameStatus, setFrameStatus] = useState<FrameStatus>("loading");
  const [isSlow, setIsSlow] = useState(false);
  const [isLocalHost, setIsLocalHost] = useState<boolean | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const slowTimerRef = useRef<number | null>(null);
  const userNavigatedRef = useRef(false);

  useEffect(() => {
    const hostname = window.location.hostname;
    setIsLocalHost(
      hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1",
    );
  }, []);

  useEffect(() => {
    const activeStillExists = options.some((option) => option.url === activeUrl);
    if (!activeStillExists) {
      setFrameStatus("loading");
      setIsSlow(false);
      setActiveUrl(getDefaultUrl(options, value));
      return;
    }
    if (
      !userNavigatedRef.current &&
      value &&
      value !== activeUrl &&
      options.some((option) => option.url === value)
    ) {
      setFrameStatus("loading");
      setIsSlow(false);
      setActiveUrl(value);
    }
  }, [activeUrl, options, value]);

  const activeIndex = options.findIndex((option) => option.url === activeUrl);
  const active = options[activeIndex] as ExplorerStyleOption | undefined;
  const useLocalSnapshot = Boolean(
    active &&
      isLocalHost === true &&
      active.localSnapshotFallback &&
      active.previewImage,
  );

  useEffect(() => {
    if (isLocalHost === null || useLocalSnapshot) {
      if (slowTimerRef.current !== null) {
        window.clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }
      return;
    }
    setFrameStatus("loading");
    setIsSlow(false);
    if (slowTimerRef.current !== null) {
      window.clearTimeout(slowTimerRef.current);
    }
    slowTimerRef.current = window.setTimeout(() => setIsSlow(true), 8000);
    return () => {
      if (slowTimerRef.current !== null) {
        window.clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }
    };
  }, [activeUrl, isLocalHost, reloadKey, useLocalSnapshot]);

  const handleFrameSettled = (status: Exclude<FrameStatus, "loading">) => {
    if (slowTimerRef.current !== null) {
      window.clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
    setIsSlow(false);
    setFrameStatus(status);
  };

  const activatePreview = (url: string) => {
    userNavigatedRef.current = true;
    if (url === activeUrl) return;
    setFrameStatus("loading");
    setIsSlow(false);
    setActiveUrl(url);
  };

  const moveToTab = (index: number) => {
    const option = options[index];
    if (!option) return;
    activatePreview(option.url);
    window.requestAnimationFrame(() => tabRefs.current[index]?.focus());
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % options.length;
    else if (event.key === "ArrowLeft")
      nextIndex = (index - 1 + options.length) % options.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = options.length - 1;
    else return;
    event.preventDefault();
    moveToTab(nextIndex);
  };

  if (!active) {
    return (
      <div className={styles.empty} role="status">
        표시할 홈페이지 스타일이 없습니다.
      </div>
    );
  }

  const previewUrl = active.previewUrl || active.url;
  const panelId = `${instanceId}-preview`;
  const selected = value === active.url;
  const statusText =
    isLocalHost === null
      ? "미리보기 환경을 확인하고 있습니다."
      : useLocalSnapshot
        ? "로컬 환경에서는 실제 화면 캡처를 보여드립니다. 메뉴 탐색은 새 창으로 확인하세요."
        : frameStatus === "failed"
          ? "프레임을 표시하지 못했습니다. 새 창으로 확인해 주세요."
          : frameStatus === "responded"
            ? "미리보기 응답을 받았습니다. 화면 안에서 직접 탐색해 주세요."
            : isSlow
              ? "미리보기 응답이 늦어지고 있습니다. 새 창에서도 확인할 수 있습니다."
              : "미리보기를 불러오는 중입니다.";

  return (
    <section className={styles.explorer} aria-label="홈페이지 스타일 탐색기">
      <div className={styles.tabs} role="tablist" aria-label="홈페이지 스타일">
        {options.map((option, index) => {
          const item = option as ExplorerStyleOption;
          const isActive = option.url === active.url;
          return (
            <button
              key={option.url}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              id={`${instanceId}-tab-${index}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              className={styles.tab}
              onClick={() => activatePreview(option.url)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              <span>{option.name}</span>
              {option.paid ? (
                <small className={styles.paidBadge}>문의</small>
              ) : item.category === "new" ? (
                <small className={styles.newBadge}>신규</small>
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${instanceId}-tab-${activeIndex}`}
        className={styles.viewer}
      >
        <div className={styles.viewerHeader}>
          <div className={styles.summary}>
            <div className={styles.titleLine}>
              <h3>{active.name}</h3>
              {selected ? <span className={styles.selectedBadge}>선택됨</span> : null}
              {active.pageCount ? (
                <span className={styles.pageCount}>{active.pageCount}페이지</span>
              ) : null}
            </div>
            <p>
              {active.description ||
                "실제 사이트 안에서 메뉴와 상세 페이지를 직접 눌러보세요."}
            </p>
          </div>

          <div className={styles.tools} aria-label="미리보기 도구">
            <div className={styles.viewportSwitch} role="group" aria-label="화면 크기">
              <button
                type="button"
                aria-pressed={viewport === "desktop"}
                onClick={() => setViewport("desktop")}
              >
                데스크톱
              </button>
              <button
                type="button"
                aria-pressed={viewport === "mobile"}
                onClick={() => setViewport("mobile")}
              >
                모바일
              </button>
            </div>
            <button
              type="button"
              className={styles.reloadButton}
              onClick={() => {
                setFrameStatus("loading");
                setIsSlow(false);
                setReloadKey((current) => current + 1);
              }}
            >
              홈부터 보기
            </button>
            <a
              className={styles.newWindowLink}
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              새 창으로 보기
            </a>
          </div>
        </div>

        <p className={styles.status} role="status" aria-live="polite">
          {statusText}
        </p>

        <div
          className={`${styles.frameStage} ${
            viewport === "mobile" ? styles.mobileStage : styles.desktopStage
          }`}
        >
          {isLocalHost === null ? (
            <div className={styles.loading} aria-hidden="true">
              <span />
              미리보기 환경을 확인하고 있습니다
            </div>
          ) : useLocalSnapshot ? (
            <div
              key={`${active.url}-${reloadKey}-snapshot`}
              className={styles.snapshot}
            >
              <img
                src={
                  viewport === "mobile"
                    ? active.previewImageMobile || active.previewImage
                    : active.previewImage
                }
                alt={`${active.name} 실제 홈페이지 화면`}
              />
            </div>
          ) : (
            <iframe
              key={`${active.url}-${reloadKey}`}
              className={styles.frame}
              src={previewUrl}
              title={`${active.name} 실제 사이트 미리보기`}
              loading="eager"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-popups"
              onLoad={() => handleFrameSettled("responded")}
              onError={() => handleFrameSettled("failed")}
            />
          )}
          {isLocalHost !== null && !useLocalSnapshot && frameStatus === "loading" ? (
            <div className={styles.loading} aria-hidden="true">
              <span />
              사이트 화면을 준비하고 있습니다
            </div>
          ) : null}
        </div>

        {onSelect ? (
          <div className={styles.selectionBar}>
            <div>
              <strong>
                {active.paid
                  ? "개별문의 스타일"
                  : selected
                    ? "현재 선택한 스타일"
                    : "이 화면이 마음에 드시나요?"}
              </strong>
              <p>
                {active.paid
                  ? "미리보기는 가능하며, 선택은 담당자 문의 후 진행합니다."
                  : "탭 이동은 미리보기만 바꾸며 이 버튼을 눌러야 선택이 반영됩니다."}
              </p>
            </div>
            <button
              type="button"
              className={active.paid ? styles.paidSelect : styles.selectButton}
              disabled={active.paid || disabled || selected}
              onClick={() => onSelect(active.url)}
            >
              {active.paid
                ? "선택 불가 · 개별문의"
                : selected
                  ? "선택됨"
                  : "이 스타일 선택"}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
