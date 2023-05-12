import { definePlugin } from 'sanity'
import { route } from 'sanity/router'

import { default as deployIcon } from './netlify-icon'
import type { NetlifyConfig } from './types'
import Netlify from './netlify'

export const netlifyTool = definePlugin<NetlifyConfig | void>(
  (options) => {
    const { name, title, icon, ...config } = options || {}

    return {
      name: 'sanity-plugin-netlify',
      tools: [
        {
          name: name || 'netlify',
          title: title || 'Deploy',
          icon: icon || deployIcon,
          component: Netlify,
          options: config,
          router: route.create('/*'),
        },
      ],
    }
  }
)
