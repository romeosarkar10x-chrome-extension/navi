import { useState } from "react";
import { IconButton } from "../core/icon-button";
import { Input, type InputProps } from "./input";

export type APIKeyInputProps = Omit<InputProps, "type" | "icon" | "trailing">;

/** Password-style key field with a show/hide toggle. Composes Input + IconButton. */
export function APIKeyInput({ placeholder = "sk-ant-…", ...rest }: APIKeyInputProps) {
    const [shown, setShown] = useState(false);
    return (
        <Input
            type={shown ? "text" : "password"}
            placeholder={placeholder}
            icon="key-round"
            trailing={
                <IconButton
                    icon={shown ? "eye-off" : "eye"}
                    size="sm"
                    label={shown ? "Hide key" : "Show key"}
                    onClick={() => setShown(v => !v)}
                />
            }
            {...rest}
        />
    );
}
