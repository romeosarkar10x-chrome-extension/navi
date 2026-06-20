// Barrel — all Navi design-system components in one import.
export { Icon, type IconName, type IconProps } from "./core/icon";
export { Button, type ButtonProps } from "./core/button";
export { IconButton, type IconButtonProps } from "./core/icon-button";
export { Badge, type BadgeProps } from "./core/badge";
export { Card, type CardProps } from "./core/card";
export { Avatar, type AvatarProps } from "./core/avatar";
export { Kbd } from "./core/kbd";

export { Input, type InputProps } from "./forms/input";
export { APIKeyInput, type APIKeyInputProps } from "./forms/api-key-input";
export { Select, type SelectProps, type SelectOption } from "./forms/select";
export { Switch, type SwitchProps } from "./forms/switch";
export { Slider, type SliderProps } from "./forms/slider";
export { PromptInput, type PromptInputProps } from "./forms/prompt-input";

export { StatusDot, type StatusDotProps } from "./feedback/status-dot";
export { StreamingIndicator, type StreamingIndicatorProps } from "./feedback/streaming-indicator";
export { Banner, type BannerProps } from "./feedback/banner";
export { Toast, type ToastProps } from "./feedback/toast";
export { Tooltip, type TooltipProps } from "./feedback/tooltip";

export { ChatMessage, type ChatMessageProps } from "./chat/chat-message";
export { Markdown, type MarkdownProps } from "./chat/markdown";
export {
    AgentActionCard,
    type AgentActionCardProps,
    type ActionType,
    type ActionStatus,
    type ActionDetail,
} from "./chat/agent-action-card";
export { ContextPill, type ContextPillProps } from "./chat/context-pill";
export { QuickActions, type QuickActionsProps, type QuickAction } from "./chat/quick-actions";
export { StepTimeline, type StepTimelineProps, type Step, type StepStatus } from "./chat/step-timeline";
