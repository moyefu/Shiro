import type { NoteWrappedWithLikedAndTranslationPayload, RequestError  } from '@mx-space/api-client'
import { useQuery } from '@tanstack/react-query'
import { atom } from 'jotai'
import type { FC } from 'react'
import { useEffect, useMemo } from 'react'

import { NoteMarkdown } from '~/app/[locale]/notes/[id]/NoteMarkdown'
import {
  IndentArticleContainer,
  NoteHeaderDate,
  NoteMarkdownImageRecordProvider,
  NoteTitle,
} from '~/app/[locale]/notes/[id]/pageExtra'
import { AckRead } from '~/components/common/AckRead'
import { ClientOnly } from '~/components/common/ClientOnly'
import { Paper } from '~/components/layout/container/Paper'
import { Loading } from '~/components/ui/loading'
import { useModalStack } from '~/components/ui/modal'
import { BottomToUpSmoothTransitionView } from '~/components/ui/transition'
import { getErrorMessageFromRequestError } from '~/lib/request.shared'
import { toast } from '~/lib/toast'
import {
  CurrentNoteDataAtomProvider,
  CurrentNoteDataProvider,
} from '~/providers/note/CurrentNoteDataProvider'
import { WrappedElementProvider } from '~/providers/shared/WrappedElementProvider'
import { queries } from '~/queries/definition'

import { NoteHideIfSecret, NoteMetaBar, NoteRootBanner } from '../note'
import { NoteHeadCover } from '../note/NoteHeadCover'
import { BanCopyWrapper } from '../shared/BanCopyWrapper'

interface NotePreviewProps {
  noteId: number
}
export const NotePreview: FC<NotePreviewProps> = (props) => {
  const { data, isLoading, error } = useQuery({
    ...queries.note.byNid(props.noteId.toString()),
    retry: false,
  })
  const { dismissTop } = useModalStack()

  useEffect(() => {
    if (error) {
      const requestError = error as RequestError
      const fetchError = requestError?.raw as {
        response?: { status?: number; _data?: { message?: string } }
      }
      const status = fetchError?.response?.status
      if (status === 403) {
        const message =
          fetchError?.response?._data?.message ||
          getErrorMessageFromRequestError(requestError)
        toast.error(message || '不要偷看人家的小心思啦~')
        dismissTop()
      }
    }
  }, [error, dismissTop])

  const overrideAtom = useMemo(
    () => atom(null! as NoteWrappedWithLikedAndTranslationPayload),
    [],
  )
  if (isLoading) return <Loading className="w-full" useDefaultLoadingText />
  if (!data) return null
  const noteData = data as NoteWrappedWithLikedAndTranslationPayload
  const note = noteData.data
  return (
    <CurrentNoteDataAtomProvider overrideAtom={overrideAtom}>
      <CurrentNoteDataProvider data={noteData} />
      {!!note.id && <AckRead id={note.id} type="note" />}
      <BottomToUpSmoothTransitionView>
        <Paper>
          <NoteHeadCover image={note.meta?.cover} />
          <IndentArticleContainer prose={note.contentFormat !== 'lexical'}>
            <header>
              <NoteTitle />
              <span className="flex flex-wrap items-center text-sm text-neutral/60">
                <NoteHeaderDate />

                <ClientOnly>
                  <NoteMetaBar />
                </ClientOnly>
              </span>
              <NoteRootBanner />
            </header>

            <NoteHideIfSecret>
              <WrappedElementProvider eoaDetect>
                <BanCopyWrapper>
                  <NoteMarkdownImageRecordProvider>
                    <NoteMarkdown />
                  </NoteMarkdownImageRecordProvider>
                </BanCopyWrapper>
              </WrappedElementProvider>
            </NoteHideIfSecret>
          </IndentArticleContainer>
        </Paper>
      </BottomToUpSmoothTransitionView>
    </CurrentNoteDataAtomProvider>
  )
}
