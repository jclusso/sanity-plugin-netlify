import { definePlugin } from 'sanity'
import { route } from 'sanity/router'

import { default as deployIcon } from './deploy-icon'
import type { NetlifyDeployConfig } from './types'
import NetlifyDeploy from './netlify-deploy'

export const netlifyDeployTool = definePlugin<NetlifyDeployConfig | void>(
  (options) => {
    const { name, title, icon, ...config } = options || {}

    return {
      name: 'sanity-plugin-netlify-deploy',
      tools: [
        {
          name: name || 'netlify-deploy',
          title: title || 'Deploy',
          icon: icon || deployIcon,
          component: NetlifyDeploy,
          options: config,
          router: route.create('/*'),
        },
      ],
    }
  }
)
