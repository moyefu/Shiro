import type {
  CommentModel,
  CommentReplyWindow,
  CommentThreadItem,
  PaginateResult,
  ReaderModel,
} from '@mx-space/api-client'
import type { InfiniteData } from '@tanstack/react-query'

import type { CommentAnchor } from './types'

export type CommentWithAnchor = CommentModel & {
  anchor?: CommentAnchor
  new?: boolean
}

export type CommentThreadViewItem = CommentWithAnchor & {
  children: CommentThreadViewItem[]
  replies?: CommentWithAnchor[]
  replyWindow?: CommentReplyWindow
}

export type CommentThreadPage = PaginateResult<
  CommentThreadItem & { ref: string }
>
export type CommentThreadInfiniteData = InfiniteData<
  CommentThreadPage & {
    readers?: Record<string, ReaderModel>
  }
>

const toTimestamp = (date: string) => new Date(date).getTime()

const byCreatedAsc = (
  a: Pick<CommentModel, 'created'>,
  b: Pick<CommentModel, 'created'>,
) => toTimestamp(a.created) - toTimestamp(b.created)

const getParentCommentId = (
  parentCommentId: CommentModel['parentCommentId'],
) => {
  if (!parentCommentId) return null
  return parentCommentId
}

const createViewComment = (
  comment: CommentWithAnchor,
): CommentThreadViewItem => ({
  ...comment,
  children: [],
})

const sortChildrenDeep = (comment: CommentThreadViewItem) => {
  comment.children.sort(byCreatedAsc)
  for (const child of comment.children) {
    sortChildrenDeep(child)
  }
}

const buildChildrenTreeRecursive = (
  rawChildren: CommentWithAnchor[],
): CommentThreadViewItem[] => {
  return rawChildren.map((child) => {
    const viewComment = createViewComment(child)
    // 递归处理嵌套的 children
    const nestedChildren = (
      child as unknown as { children?: CommentWithAnchor[] }
    ).children
    if (nestedChildren && nestedChildren.length > 0) {
      viewComment.children = buildChildrenTreeRecursive(nestedChildren)
    }
    return viewComment
  })
}

export const buildCommentTreeItem = (
  rootComment: CommentThreadItem | (CommentThreadViewItem & { ref?: string }),
): CommentThreadViewItem => {
  const rootView = createViewComment(rootComment)

  // 优先使用 replies 字段（扁平结构），如果没有则使用 children 字段（嵌套结构）
  const rawReplies = rootComment.replies
  const rawChildren = (
    rootComment as unknown as { children?: CommentWithAnchor[] }
  ).children

  if (rawReplies && rawReplies.length > 0) {
    // 处理扁平的 replies 结构（使用 parentCommentId 或 parent 字段）
    const replyViews = rawReplies.map((reply) => createViewComment(reply))

    const commentMap = new Map<string, CommentThreadViewItem>([
      [rootView.id, rootView],
      ...replyViews.map((reply) => [reply.id, reply] as const),
    ])

    for (const reply of replyViews.sort(byCreatedAsc)) {
      const rawParentId =
        reply.parentCommentId ??
        (reply as unknown as { parent?: string }).parent
      const parentId = getParentCommentId(
        rawParentId as CommentModel['parentCommentId'],
      )
      const parent = (parentId && commentMap.get(parentId)) || rootView
      parent.children.push(reply)
    }

    sortChildrenDeep(rootView)

    return {
      ...rootView,
      replies: dedupeRepliesById(rawReplies),
      replyWindow: rootComment.replyWindow,
    }
  }

  // 处理嵌套的 children 结构（直接使用后端的嵌套结构）
  if (rawChildren && rawChildren.length > 0) {
    rootView.children = buildChildrenTreeRecursive(rawChildren)
    sortChildrenDeep(rootView)
  }

  // 收集所有子评论用于 replies 字段
  const allReplies: CommentWithAnchor[] = []
  const collectAllChildren = (comments: CommentWithAnchor[]) => {
    for (const comment of comments) {
      allReplies.push(comment)
      const nested = (comment as unknown as { children?: CommentWithAnchor[] })
        .children
      if (nested && nested.length > 0) {
        collectAllChildren(nested)
      }
    }
  }
  if (rawChildren) {
    collectAllChildren(rawChildren)
  }

  return {
    ...rootView,
    replies: dedupeRepliesById(allReplies),
    replyWindow: rootComment.replyWindow,
  }
}

export const flattenThreadComments = (
  comments: Array<
    CommentThreadItem | (CommentThreadViewItem & { ref?: string })
  >,
): CommentWithAnchor[] => {
  const result: CommentWithAnchor[] = []
  for (const comment of comments) {
    result.push(comment)
    // 优先使用 replies 字段，如果没有则使用 children 字段
    const replies =
      comment.replies ??
      (comment as unknown as { children?: CommentWithAnchor[] }).children
    if (replies) {
      result.push(...replies)
    }
  }
  return dedupeRepliesById(result)
}

export const dedupeRepliesById = <T extends Pick<CommentModel, 'id'>>(
  comments: readonly T[],
): T[] => {
  const seen = new Set<string>()
  const result: T[] = []
  for (const comment of comments) {
    if (seen.has(comment.id)) continue
    seen.add(comment.id)
    result.push(comment)
  }
  return result
}

export const mergeThreadRepliesIntoPages = (
  data: CommentThreadInfiniteData,
  {
    rootCommentId,
    replies,
    replyWindow,
  }: {
    rootCommentId: string
    replies: CommentWithAnchor[]
    replyWindow: CommentReplyWindow
  },
): CommentThreadInfiniteData => ({
  ...data,
  pages: data.pages.map((page) => ({
    ...page,
    data: page.data.map((comment) => {
      if (comment.id !== rootCommentId) return comment

      return {
        ...comment,
        replies: dedupeRepliesById([
          ...(comment.replies ?? []),
          ...replies,
        ]).sort(byCreatedAsc),
        replyWindow,
      }
    }),
  })),
})
