"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  CheckCircle2,
  Circle,
  Clock,
  Package,
  Truck,
  FileCheck,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  status: "completed" | "current" | "pending" | "warning";
  timestamp?: Date;
  icon?: "check" | "clock" | "package" | "truck" | "file" | "alert";
}

interface StatusTimelineProps {
  events: TimelineEvent[];
  orientation?: "vertical" | "horizontal";
}

export function StatusTimeline({
  events,
  orientation = "vertical",
}: StatusTimelineProps) {
  const getIcon = (iconType?: string, status?: string) => {
    const iconSize = "w-5 h-5 sm:w-6 sm:h-6";

    switch (iconType) {
      case "check":
        return <CheckCircle2 className={iconSize} />;
      case "clock":
        return <Clock className={iconSize} />;
      case "package":
        return <Package className={iconSize} />;
      case "truck":
        return <Truck className={iconSize} />;
      case "file":
        return <FileCheck className={iconSize} />;
      case "alert":
        return <AlertCircle className={iconSize} />;
      default:
        return status === "completed" ? (
          <CheckCircle2 className={iconSize} />
        ) : (
          <Circle className={iconSize} />
        );
    }
  };

  const getStatusConfig = (status: TimelineEvent["status"]) => {
    switch (status) {
      case "completed":
        return {
          iconBg: "bg-ok-50",
          iconColor: "text-ok-600",
          lineColor: "bg-ok-100",
          textColor: "text-gray-900",
          subTextColor: "text-gray-600",
        };
      case "current":
        return {
          iconBg: "bg-navy-100 ring-4 ring-navy-50",
          iconColor: "text-navy-600",
          lineColor: "bg-gray-200",
          textColor: "text-navy-900 font-bold",
          subTextColor: "text-navy-700",
        };
      case "warning":
        return {
          iconBg: "bg-terra-50",
          iconColor: "text-terra-500",
          lineColor: "bg-gray-200",
          textColor: "text-terra-600 font-semibold",
          subTextColor: "text-terra-500",
        };
      case "pending":
      default:
        return {
          iconBg: "bg-navy-50",
          iconColor: "text-navy-300",
          lineColor: "bg-gray-200",
          textColor: "text-navy-300",
          subTextColor: "text-navy-200",
        };
    }
  };

  if (orientation === "horizontal") {
    // Horizontal Timeline - Better for desktop
    return (
      <div className="hidden lg:block w-full overflow-x-auto">
        <div className="flex items-start justify-between min-w-max px-4">
          {events.map((event, index) => {
            const config = getStatusConfig(event.status);
            return (
              <div key={event.id} className="flex items-center">
                <div className="flex flex-col items-center min-w-[120px]">
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex items-center justify-center w-12 h-12 rounded-full",
                      config.iconBg,
                      config.iconColor,
                    )}
                  >
                    {getIcon(event.icon, event.status)}
                  </div>
                  {/* Content */}
                  <div className="mt-3 text-center">
                    <p className={cn("text-sm font-medium", config.textColor)}>
                      {event.title}
                    </p>
                    {event.description && (
                      <p className={cn("text-xs mt-1", config.subTextColor)}>
                        {event.description}
                      </p>
                    )}
                    {event.timestamp && (
                      <p className="text-xs text-gray-400 mt-1">
                        {format(event.timestamp, "MM/dd HH:mm", { locale: ko })}
                      </p>
                    )}
                  </div>
                </div>
                {/* Connector Line */}
                {index < events.length - 1 && (
                  <div
                    className={cn(
                      "h-1 w-16 mx-2 rounded-full",
                      config.lineColor,
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Vertical Timeline - Mobile Optimized
  return (
    <div className="w-full space-y-0">
      {events.map((event, index) => {
        const config = getStatusConfig(event.status);
        const isLast = index === events.length - 1;

        return (
          <div key={event.id} className="flex gap-4 relative pb-8 last:pb-0">
            {/* Timeline Line */}
            {!isLast && (
              <div className="absolute left-[22px] sm:left-[26px] top-[48px] w-0.5 h-full -mb-8">
                <div className={cn("w-full h-full", config.lineColor)} />
              </div>
            )}

            {/* Icon */}
            <div className="relative z-10 flex-shrink-0">
              <div
                className={cn(
                  "flex items-center justify-center rounded-full transition-all",
                  "w-11 h-11 sm:w-14 sm:h-14",
                  config.iconBg,
                  config.iconColor,
                )}
              >
                {getIcon(event.icon, event.status)}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <div
                className={cn(
                  "p-4 rounded-xl border transition-all",
                  event.status === "current"
                    ? "bg-white border-navy-200 shadow-sm"
                    : event.status === "completed"
                      ? "bg-white border-gray-200"
                      : event.status === "warning"
                        ? "bg-terra-50 border-terra-100"
                        : "bg-gray-50 border-gray-100",
                )}
              >
                <h3 className={cn("text-base font-semibold", config.textColor)}>
                  {event.title}
                </h3>
                {event.description && (
                  <p
                    className={cn(
                      "text-sm mt-1 leading-relaxed",
                      config.subTextColor,
                    )}
                  >
                    {event.description}
                  </p>
                )}
                {event.timestamp && (
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(event.timestamp, "yyyy년 MM월 dd일 HH:mm", {
                      locale: ko,
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
