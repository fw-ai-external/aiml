import { beforeEach, describe, expect, it } from 'bun:test';
import type { SerializedBaseElement } from '@fireworks/shared';
import type { ActionContext } from '@mastra/core';
import { z } from 'zod';
import { StepValue } from '../../StepValue';
import { BaseElement } from '../BaseElement';
import { MockMastraContext } from '../utils/MockMastraContext';
import { Final } from './FinalElement';

describe('FinalElement', () => {
  let ctx: ActionContext<any>;
  let root: BaseElement;

  beforeEach(() => {
    root = new BaseElement({
      id: 'root',
      elementType: 'workflow',
      tag: 'workflow',
      role: 'state',
      key: 'root',
      type: 'element',
      lineStart: 0,
      lineEnd: 0,
      columnStart: 0,
      columnEnd: 0,
      allowedChildren: 'any',
      schema: z.object({}),
      onExecutionGraphConstruction: () => ({}) as any,
    });

    ctx = new MockMastraContext({
      input: new StepValue({
        type: 'text',
        text: 'test',
      }),

      state: {
        id: 'test',
        attributes: {},
        input: new StepValue({
          type: 'text',
          text: 'test',
        }),
      },
    });
  });

  it('should create instance with correct properties', () => {
    const element = Final.initFromAttributesAndNodes(
      {
        id: 'final1',
      },
      [],
      new WeakRef(root),
    );

    expect((element as BaseElement).elementType).toBe('final');
  });

  it.skip('should execute and handle onentry elements', async () => {
    const onEntry = Final.initFromAttributesAndNodes(
      {
        id: 'entry1',
      },
      [],
      new WeakRef(root),
    );

    const element = Final.initFromAttributesAndNodes(
      {
        id: 'final1',
      },
      [onEntry as SerializedBaseElement],
      new WeakRef(root),
    );

    const result = await (element as BaseElement).execute(ctx as any);
    const value = await result?.result?.value();
    // @ts-expect-error
    expect(value).toEqual({
      object: {
        id: 'final1',
        isActive: true,
      },
    });
  });

  it.skip('should execute with parent state', async () => {
    const parent = Final.initFromAttributesAndNodes(
      {
        id: 'parent',
      },
      [],
      new WeakRef(root),
    );

    const element = Final.initFromAttributesAndNodes(
      {
        id: 'final1',
      },
      [],
      new WeakRef(parent as BaseElement),
    );

    const result = await (element as BaseElement).execute(ctx as any);
    const value = await result?.result?.value();
    // @ts-expect-error
    expect(value).toEqual({
      object: {
        id: 'final1',
        isActive: true,
      },
    });
  });
});
