'use client'

import { useEffect, useState } from 'react'
import { getImage, isStoredImageReference } from '@/lib/image-storage'

interface LoadedImage {
  reference: string
  url: string
}

interface ImageError {
  reference: string
  message: string
}

export function useClothingImage(image: string | undefined) {
  const reference = image && isStoredImageReference(image) ? image : null
  const [loadedImage, setLoadedImage] = useState<LoadedImage | null>(null)
  const [imageError, setImageError] = useState<ImageError | null>(null)

  useEffect(() => {
    if (!reference) return

    let active = true
    let objectUrl: string | null = null

    void getImage(reference)
      .then((blob) => {
        if (!blob) throw new Error('The stored image could not be found.')
        const url = URL.createObjectURL(blob)
        if (!active) {
          URL.revokeObjectURL(url)
          return
        }
        objectUrl = url
        setLoadedImage({ reference, url })
      })
      .catch((error: unknown) => {
        if (active) {
          setImageError({
            reference,
            message: error instanceof Error ? error.message : 'Unable to load this image.',
          })
        }
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [reference])

  if (!image) return { src: null, error: null }
  if (!reference) return { src: image, error: null }

  return {
    src: loadedImage?.reference === reference ? loadedImage.url : null,
    error: imageError?.reference === reference ? imageError.message : null,
  }
}
