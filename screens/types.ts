import type { ReactNode } from 'react';
import type { ActionDetail, ActionStatus, ActionType } from '@/components';

export type ViewKey = 'welcome' | 'connect' | 'chat' | 'settings' | 'task' | 'history' | 'recipes';

export type Provider = 'cloud' | 'local';

export type ModelID = 'claude-sonnet-4' | 'claude-opus-4' | 'mistral-7b';

/** A chat turn — either a rendered message or an inline agent-action card. */
export interface ChatTurn {
  kind?: 'action';
  role?: 'user' | 'assistant';
  meta?: ReactNode;
  body?: ReactNode;
  // action-card fields (when kind === "action")
  type?: ActionType;
  label?: ReactNode;
  status?: ActionStatus;
  detail?: ActionDetail[];
  open?: boolean;
}
