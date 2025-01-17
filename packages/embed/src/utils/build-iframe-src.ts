import { ActionableOptions, BaseOptions, EmbedType, SizeableOptions, UrlOptions } from '../base'
import { FORM_BASE_URL } from '../constants'

import { removeUndefinedKeys } from './remove-undefined-keys'
import { isDefined } from './is-defined'
import { getTransitiveSearchParams } from './get-transitive-search-params'
import { getHubspotHiddenFields } from './hubspot'

const getDefaultUrlOptions = (): UrlOptions => ({
  source: window?.location?.hostname.replace(/^www\./, ''),
  medium: 'embed-sdk',
  mediumVersion: 'next',
})

const addDefaultUrlOptions = (options: UrlOptions): UrlOptions => {
  return { ...getDefaultUrlOptions(), ...removeUndefinedKeys(options) }
}

const typesToEmbed: Record<EmbedType, string> = {
  widget: 'embed-widget', // TODO: when widget is full page use 'embed-fullpage'
  popup: 'popup-blank',
  slider: 'popup-drawer',
  popover: 'popup-popover',
  'side-tab': 'popup-side-panel',
}

const mapOptionsToQueryParams = (
  type: EmbedType,
  embedId: string,
  options: UrlOptions & SizeableOptions & ActionableOptions
): Record<string, any> => {
  const {
    transitiveSearchParams,
    source,
    medium,
    mediumVersion,
    hideFooter,
    hideHeaders,
    opacity,
    disableTracking,
    enableSandbox,
    shareGaInstance,
    forceTouch,
    displayAsFullScreenModal,
    tracking,
    redirectTarget,
    autoResize,
    disableScroll,
    onEndingButtonClick,
  } = options
  const transitiveParams = getTransitiveSearchParams(transitiveSearchParams)
  const params = {
    'typeform-embed-id': embedId,
    'typeform-embed': typesToEmbed[type],
    'typeform-source': source,
    'typeform-medium': medium,
    'typeform-medium-version': mediumVersion,
    'embed-hide-footer': hideFooter ? 'true' : undefined,
    'embed-hide-headers': hideHeaders ? 'true' : undefined,
    'embed-opacity': opacity,
    'disable-tracking': disableTracking || enableSandbox ? 'true' : undefined,
    '__dangerous-disable-submissions': enableSandbox ? 'true' : undefined,
    'share-ga-instance': shareGaInstance ? 'true' : undefined,
    'force-touch': forceTouch ? 'true' : undefined,
    'add-placeholder-ws': type === 'widget' && displayAsFullScreenModal ? 'true' : undefined,
    'typeform-embed-redirect-target': redirectTarget,
    'typeform-embed-auto-resize': autoResize ? 'true' : undefined,
    'typeform-embed-disable-scroll': disableScroll ? 'true' : undefined,
    'typeform-embed-handle-ending-button-click': !!onEndingButtonClick ? 'true' : undefined,
  }
  return { ...params, ...transitiveParams, ...tracking }
}

const getBaseUrl = (formString: string, chat: boolean = false): URL => {
  const prefix = chat ? 'c' : 'to'
  return new URL(
    formString.startsWith('http://') || formString.startsWith('https://')
      ? formString
      : `${FORM_BASE_URL}/${prefix}/${formString}`
  )
}

export const buildIframeSrc = (params: BuildIframeSrcOptions): string => {
  const { formId, type, embedId, options } = params
  const queryParams = mapOptionsToQueryParams(type, embedId, addDefaultUrlOptions(options))

  const url = getBaseUrl(formId, options.chat)

  Object.entries(queryParams)
    .filter(([, paramValue]) => isDefined(paramValue))
    .forEach(([paramName, paramValue]) => {
      url.searchParams.set(paramName, paramValue)
    })

  if (options.hubspot) {
    const hubspotHiddenFields = getHubspotHiddenFields()
    options.hidden = { ...options.hidden, ...hubspotHiddenFields }
  }

  if (options.hidden) {
    const tmpHashUrl = new URL(FORM_BASE_URL)
    Object.entries(options.hidden)
      .filter(([, paramValue]) => isDefined(paramValue) && paramValue !== '')
      .forEach(([paramName, paramValue]) => {
        // if transitive params is true, make hidden field values take priority over transitive params
        if (typeof options.transitiveSearchParams === 'boolean') {
          url.searchParams.delete(paramName)
        }
        tmpHashUrl.searchParams.set(paramName, paramValue)
      })
    const hiddenFields = tmpHashUrl.searchParams.toString()
    if (hiddenFields) {
      url.hash = hiddenFields
    }
  }

  return url.href
}

type BuildIframeSrcOptions = {
  formId: string
  embedId: string
  type: EmbedType
  options: BaseOptions & UrlOptions
}
