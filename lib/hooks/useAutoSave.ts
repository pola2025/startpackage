"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useDebounce } from "./useDebounce";

interface AutoSaveOptions {
  delay?: number; // Delay in milliseconds before saving (default: 2000)
  onSave: (data: any) => Promise<void>;
  onError?: (error: Error) => void;
}

interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
}

export function useAutoSave<T>(
  data: T,
  { delay = 2000, onSave, onError }: AutoSaveOptions
) {
  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    error: null,
  });

  const debouncedData = useDebounce(data, delay);
  const initialRender = useRef(true);
  const previousData = useRef<T>(data);

  const save = useCallback(async () => {
    // Don't save if data hasn't changed
    if (JSON.stringify(debouncedData) === JSON.stringify(previousData.current)) {
      return;
    }

    setState((prev) => ({ ...prev, isSaving: true, error: null }));

    try {
      await onSave(debouncedData);
      previousData.current = debouncedData;
      setState({
        isSaving: false,
        lastSaved: new Date(),
        error: null,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error("저장 중 오류 발생");
      setState((prev) => ({
        ...prev,
        isSaving: false,
        error: err,
      }));
      onError?.(err);
    }
  }, [debouncedData, onSave, onError]);

  useEffect(() => {
    // Skip initial render
    if (initialRender.current) {
      initialRender.current = false;
      previousData.current = debouncedData;
      return;
    }

    save();
  }, [save]);

  return state;
}
