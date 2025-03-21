import { z } from 'zod';
import type { AllowedChildrenType, BaseElementDefinition } from '../../types';

/**
 * Control Flow Elements
 * These elements define the control flow and conditional logic in SCXML
 */

// If Element - Conditional execution
export const ifConfig: BaseElementDefinition = {
  tag: 'if',
  elementType: 'if',
  role: 'action',
  propsSchema: z.object({
    id: z.string().optional(),
    cond: z.string().optional(),
  }),
  description: 'Conditional execution based on a test condition',
  allowedChildren: ['elseif', 'else'] as AllowedChildrenType,
  documentation: 'Conditional execution based on a test condition, can contain elseif and else blocks',
};

export type IfProps = z.infer<typeof ifConfig.propsSchema>;

// ElseIf Element - Alternative conditional branch
export const elseIfConfig: BaseElementDefinition = {
  tag: 'elseif',
  elementType: 'elseif',
  role: 'action',
  propsSchema: z.object({
    id: z.string().optional(),
    cond: z.string(),
  }),
  description: 'Alternative conditional branch for an if element',
  allowedChildren: 'any' as AllowedChildrenType,
  documentation: 'Alternative conditional branch for an if element',
};

export type ElseIfProps = z.infer<typeof elseIfConfig.propsSchema>;

// Else Element - Default execution branch
export const elseConfig: BaseElementDefinition = {
  tag: 'else',
  elementType: 'else',
  role: 'action',
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: 'Default branch for an if element when no conditions match',
  allowedChildren: 'any' as AllowedChildrenType,
  documentation: 'Default branch for an if element when no conditions match',
};

export type ElseProps = z.infer<typeof elseConfig.propsSchema>;

// ForEach Element - Iteration construct
export const forEachConfig: BaseElementDefinition = {
  tag: 'foreach',
  elementType: 'foreach',
  role: 'action',
  propsSchema: z.object({
    id: z.string().optional(),
    array: z.string(),
    item: z.string(),
    index: z.string().optional(),
  }),
  description: 'Iteration construct for arrays',
  allowedChildren: 'any' as AllowedChildrenType,
  documentation: 'Iteration construct for processing arrays',
};

export type ForEachProps = z.infer<typeof forEachConfig.propsSchema>;

// Transition Element - Defines state transitions
export const transitionConfig: BaseElementDefinition = {
  tag: 'transition',
  elementType: 'transition',
  role: 'action',
  propsSchema: z.object({
    id: z.string().optional(),
    event: z.string().optional(),
    cond: z.string().optional(),
    target: z.string().optional(),
    type: z.enum(['internal', 'external']).optional(),
  }),
  description: 'Defines transitions between states',
  allowedChildren: 'any' as AllowedChildrenType,
  documentation: 'Defines transitions between states based on events and conditions',
};

export type TransitionProps = z.infer<typeof transitionConfig.propsSchema>;

// OnEntry Element - Actions when entering a state
export const onEntryConfig: BaseElementDefinition = {
  tag: 'onentry',
  elementType: 'onentry',
  role: 'action',
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: 'Executable content to be run when entering a state',
  allowedChildren: 'any' as AllowedChildrenType,
  documentation: 'Executable content to be run when entering a state',
};

export type OnEntryProps = z.infer<typeof onEntryConfig.propsSchema>;

// OnExit Element - Actions when exiting a state
export const onExitConfig: BaseElementDefinition = {
  tag: 'onexit',
  elementType: 'onexit',
  role: 'action',
  propsSchema: z.object({
    id: z.string().optional(),
  }),
  description: 'Executable content to be run when exiting a state',
  allowedChildren: 'any' as AllowedChildrenType,
  documentation: 'Executable content to be run when exiting a state',
};

export type OnExitProps = z.infer<typeof onExitConfig.propsSchema>;
