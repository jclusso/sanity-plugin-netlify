import React from 'react'

export type StatusType =
  | 'LOADING'
  | 'NEW'
  | 'ERROR'
  | 'ENQUEUED'
  | 'PREPARING'
  | 'PROCESSING'
  | 'CANCELED'
  | 'READY'
  | 'BUILDING'

export interface SanityDeploySchema {
  _id: string
  name: string
  siteId: string
  buildHook: string
  branch: string
  accessToken: string
  onlyShowProductionDeploys: boolean
  disableDeleteAction: boolean
}

export interface Deployments {
  [key: string]: unknown
  id: string
  branch: string
  commit_ref: string
  commit_url: string
  committer: string
  created_at: string
  deploy_time: number
  links: {
    [key: string]: unknown
    permalink?: string
  }
  admin_url: string
  error_message: string
  state: string
}

export interface NetlifyConfig {
  name?: string
  icon?: React.ReactNode
  title?: string
}
