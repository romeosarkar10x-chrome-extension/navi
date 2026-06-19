import type { CSSProperties } from "react";
import type { IconType } from "react-icons";
import {
    LuArrowLeft,
    LuArrowRight,
    LuArrowUp,
    LuBookmark,
    LuCamera,
    LuCheck,
    LuCircleCheckBig,
    LuChevronDown,
    LuCircle,
    LuCircleAlert,
    LuCompass,
    LuCpu,
    LuDownload,
    LuEye,
    LuEyeOff,
    LuFileText,
    LuGlobe,
    LuHistory,
    LuInfo,
    LuKeyRound,
    LuKeyboard,
    LuLink,
    LuLoader,
    LuMousePointerClick,
    LuPanelRightClose,
    LuPause,
    LuPlay,
    LuPlugZap,
    LuPlus,
    LuScanText,
    LuSettings2,
    LuShieldCheck,
    LuSparkles,
    LuSquare,
    LuTable,
    LuTextCursorInput,
    LuTrash2,
    LuTriangleAlert,
    LuWorkflow,
    LuX,
    LuZap,
} from "react-icons/lu";

/** kebab-case name → react-icons (Lucide set) component. */
const ICONS = {
    "arrow-left": LuArrowLeft,
    "arrow-right": LuArrowRight,
    "arrow-up": LuArrowUp,
    "bookmark": LuBookmark,
    "camera": LuCamera,
    "check": LuCheck,
    "check-circle-2": LuCircleCheckBig,
    "chevron-down": LuChevronDown,
    "circle": LuCircle,
    "circle-alert": LuCircleAlert,
    "compass": LuCompass,
    "cpu": LuCpu,
    "download": LuDownload,
    "eye": LuEye,
    "eye-off": LuEyeOff,
    "file-text": LuFileText,
    "globe": LuGlobe,
    "history": LuHistory,
    "info": LuInfo,
    "key-round": LuKeyRound,
    "keyboard": LuKeyboard,
    "link": LuLink,
    "loader": LuLoader,
    "mouse-pointer-click": LuMousePointerClick,
    "panel-right-close": LuPanelRightClose,
    "pause": LuPause,
    "play": LuPlay,
    "plug-zap": LuPlugZap,
    "plus": LuPlus,
    "scan-text": LuScanText,
    "settings-2": LuSettings2,
    "shield-check": LuShieldCheck,
    "sparkles": LuSparkles,
    "square": LuSquare,
    "table": LuTable,
    "text-cursor-input": LuTextCursorInput,
    "trash-2": LuTrash2,
    "triangle-alert": LuTriangleAlert,
    "workflow": LuWorkflow,
    "x": LuX,
    "zap": LuZap,
} satisfies Record<string, IconType>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
    name: IconName;
    size?: number;
    strokeWidth?: number;
    color?: string;
    className?: string;
    style?: CSSProperties;
}

/**
 * Navi icon — thin wrapper over react-icons (Lucide set).
 * Renders in currentColor at the given pixel size.
 */
export function Icon({
    name,
    size = 16,
    strokeWidth = 2,
    color = "currentColor",
    className = "",
    style = {},
}: IconProps) {
    const Cmp = ICONS[name] ?? LuCircle;
    return (
        <Cmp
            size={size}
            strokeWidth={strokeWidth}
            color={color}
            className={className}
            style={{ flex: "none", display: "block", ...style }}
            aria-hidden="true"
        />
    );
}
