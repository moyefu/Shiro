import type {
  CollectionRefTypes,
  CommentModel,
  CommentThreadItem,
  PaginateResult,
} from '@mx-space/api-client'
import type { InfiniteData } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { buildCommentTreeItem, mergeThreadRepliesIntoPages } from './thread'

const makeComment = (
  id: string,
  created: string,
  overrides: Partial<CommentModel> = {},
): CommentModel => ({
  id,
  created,
  refType: 'posts' as CollectionRefTypes,
  ref: 'post-id',
  state: 1,
  author: `author-${id}`,
  text: `text-${id}`,
  avatar: '',
  ...overrides,
})

describe('comment thread helpers', () => {
  it('rebuilds nested children from flat replies using parentCommentId', () => {
    const root: CommentThreadItem = {
      ...makeComment('root', '2026-03-14T10:00:00.000Z', {
        parentCommentId: null,
        rootCommentId: null,
      }),
      replies: [
        makeComment('child-2', '2026-03-14T10:03:00.000Z', {
          parentCommentId: 'child-1',
          rootCommentId: 'root',
        }),
        makeComment('child-1', '2026-03-14T10:01:00.000Z', {
          parentCommentId: 'root',
          rootCommentId: 'root',
        }),
        makeComment('orphan', '2026-03-14T10:02:00.000Z', {
          parentCommentId: 'missing-parent',
          rootCommentId: 'root',
        }),
      ],
      replyWindow: {
        total: 3,
        returned: 3,
        threshold: 20,
        hasHidden: false,
        hiddenCount: 0,
      },
    }

    const tree = buildCommentTreeItem(root)

    expect(tree.children.map((comment) => comment.id)).toEqual([
      'child-1',
      'orphan',
    ])
    expect(tree.children[0]?.children.map((comment) => comment.id)).toEqual([
      'child-2',
    ])
  })

  it('merges loaded middle replies back into paginated thread data', () => {
    const root: CommentThreadItem & { ref: string } = {
      ...makeComment('root', '2026-03-14T10:00:00.000Z', {
        parentCommentId: null,
        rootCommentId: null,
      }),
      ref: 'post-id',
      replies: [
        makeComment('child-1', '2026-03-14T10:01:00.000Z', {
          parentCommentId: 'root',
          rootCommentId: 'root',
        }),
        makeComment('child-3', '2026-03-14T10:03:00.000Z', {
          parentCommentId: 'root',
          rootCommentId: 'root',
        }),
      ],
      replyWindow: {
        total: 3,
        returned: 2,
        threshold: 20,
        hasHidden: true,
        hiddenCount: 1,
        nextCursor: 'cursor-1',
      },
    }

    const data = {
      pageParams: [1],
      pages: [
        {
          data: [root],
          pagination: {
            currentPage: 1,
            totalPage: 1,
            hasPrevPage: false,
            hasNextPage: false,
            size: 10,
            total: 1,
          },
        },
      ],
    } satisfies InfiniteData<
      PaginateResult<CommentThreadItem & { ref: string }>
    >

    const next = mergeThreadRepliesIntoPages(data, {
      rootCommentId: 'root',
      replies: [
        makeComment('child-2', '2026-03-14T10:02:00.000Z', {
          parentCommentId: 'child-1',
          rootCommentId: 'root',
        }),
      ],
      replyWindow: {
        total: 3,
        returned: 3,
        threshold: 20,
        hasHidden: false,
        hiddenCount: 0,
      },
    })

    expect(
      next.pages[0]?.data[0]?.replies.map((comment) => comment.id),
    ).toEqual(['child-1', 'child-2', 'child-3'])
    expect(next.pages[0]?.data[0]?.replyWindow.hasHidden).toBe(false)
  })

  it('handles object format parentCommentId from backend', () => {
    const root: CommentThreadItem = {
      ...makeComment('root', '2026-03-14T10:00:00.000Z', {
        parentCommentId: null,
        rootCommentId: null,
      }),
      replies: [
        makeComment('child-1', '2026-03-14T10:01:00.000Z', {
          parentCommentId: { id: 'root' } as unknown as string,
          rootCommentId: 'root',
        }),
        makeComment('child-2', '2026-03-14T10:02:00.000Z', {
          parentCommentId: { id: 'child-1' } as unknown as string,
          rootCommentId: 'root',
        }),
      ],
      replyWindow: {
        total: 2,
        returned: 2,
        threshold: 20,
        hasHidden: false,
        hiddenCount: 0,
      },
    }

    const tree = buildCommentTreeItem(root)

    expect(tree.children.map((comment) => comment.id)).toEqual(['child-1'])
    expect(tree.children[0]?.children.map((comment) => comment.id)).toEqual([
      'child-2',
    ])
  })

  it('handles nested children format from backend API', () => {
    // 模拟后端返回的 children 嵌套格式
    const root = {
      ...makeComment('root', '2026-03-14T10:00:00.000Z', {
        parentCommentId: null,
        rootCommentId: null,
      }),
      children: [
        {
          ...makeComment('child-1', '2026-03-14T10:01:00.000Z', {
            parentCommentId: undefined,
            rootCommentId: 'root',
          }),
          parent: 'root',
          children: [
            {
              ...makeComment('child-2', '2026-03-14T10:02:00.000Z', {
                parentCommentId: undefined,
                rootCommentId: 'root',
              }),
              parent: 'child-1',
              children: [],
            },
          ],
        },
      ],
    } as unknown as CommentThreadItem

    const tree = buildCommentTreeItem(root)

    expect(tree.children.map((comment) => comment.id)).toEqual(['child-1'])
    expect(tree.children[0]?.children.map((comment) => comment.id)).toEqual([
      'child-2',
    ])
  })

  it('handles three-level nested comments from backend API', () => {
    // 模拟后端返回的三级嵌套 children 格式
    const root = {
      ...makeComment('root', '2026-03-14T10:00:00.000Z', {
        parentCommentId: null,
        rootCommentId: null,
      }),
      children: [
        {
          ...makeComment('child-1', '2026-03-14T10:01:00.000Z', {
            parentCommentId: undefined,
            rootCommentId: 'root',
          }),
          parent: 'root',
          children: [
            {
              ...makeComment('child-2', '2026-03-14T10:02:00.000Z', {
                parentCommentId: undefined,
                rootCommentId: 'root',
              }),
              parent: 'child-1',
              children: [
                {
                  ...makeComment('child-3', '2026-03-14T10:03:00.000Z', {
                    parentCommentId: undefined,
                    rootCommentId: 'root',
                  }),
                  parent: 'child-2',
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    } as unknown as CommentThreadItem

    const tree = buildCommentTreeItem(root)

    // 验证层级结构
    expect(tree.children.map((comment) => comment.id)).toEqual(['child-1'])
    expect(tree.children[0]?.children.map((comment) => comment.id)).toEqual([
      'child-2',
    ])
    expect(
      tree.children[0]?.children[0]?.children.map((comment) => comment.id),
    ).toEqual(['child-3'])
  })

  it('handles real backend data format with three levels', () => {
    // 模拟用户提供的真实后端数据格式
    const root = {
      id: '6a0ada478a072e477977886b',
      ref: '6a03d6fe7abb7c6bd488e870',
      refType: 'posts',
      author: 'test',
      text: '1',
      state: 0,
      children: [
        {
          id: '6a0ada658a072e47797788c4',
          ref: '6a03d6fe7abb7c6bd488e870',
          refType: 'posts',
          author: 'myf',
          text: '???',
          state: 0,
          parent: '6a0ada478a072e477977886b',
          children: [
            {
              id: '6a0adec08a072e4779778c0b',
              ref: '6a03d6fe7abb7c6bd488e870',
              refType: 'posts',
              author: 'myf',
              text: '6',
              state: 0,
              parent: '6a0ada658a072e47797788c4',
              children: [],
              created: '2026-05-18T09:41:20.533Z',
            },
          ],
          created: '2026-05-18T09:22:45.210Z',
        },
      ],
      created: '2026-05-18T09:22:15.351Z',
    } as unknown as CommentThreadItem

    const tree = buildCommentTreeItem(root)

    // 验证层级结构
    expect(tree.children.map((comment) => comment.id)).toEqual([
      '6a0ada658a072e47797788c4',
    ])
    expect(tree.children[0]?.children.map((comment) => comment.id)).toEqual([
      '6a0adec08a072e4779778c0b',
    ])
  })

  it('handles four-level nested comments from backend API', () => {
    // 模拟后端返回的四级嵌套 children 格式
    const root = {
      ...makeComment('root', '2026-03-14T10:00:00.000Z', {
        parentCommentId: null,
        rootCommentId: null,
      }),
      children: [
        {
          ...makeComment('level-1', '2026-03-14T10:01:00.000Z', {
            parentCommentId: undefined,
            rootCommentId: 'root',
          }),
          parent: 'root',
          children: [
            {
              ...makeComment('level-2', '2026-03-14T10:02:00.000Z', {
                parentCommentId: undefined,
                rootCommentId: 'root',
              }),
              parent: 'level-1',
              children: [
                {
                  ...makeComment('level-3', '2026-03-14T10:03:00.000Z', {
                    parentCommentId: undefined,
                    rootCommentId: 'root',
                  }),
                  parent: 'level-2',
                  children: [
                    {
                      ...makeComment('level-4', '2026-03-14T10:04:00.000Z', {
                        parentCommentId: undefined,
                        rootCommentId: 'root',
                      }),
                      parent: 'level-3',
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    } as unknown as CommentThreadItem

    const tree = buildCommentTreeItem(root)

    // 验证四级层级结构
    expect(tree.children.map((c) => c.id)).toEqual(['level-1'])
    expect(tree.children[0]?.children.map((c) => c.id)).toEqual(['level-2'])
    expect(tree.children[0]?.children[0]?.children.map((c) => c.id)).toEqual([
      'level-3',
    ])
    expect(
      tree.children[0]?.children[0]?.children[0]?.children.map((c) => c.id),
    ).toEqual(['level-4'])
  })
})
