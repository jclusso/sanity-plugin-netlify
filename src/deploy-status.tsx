import React from 'react'

import {
  Box,
  Text,
  Badge,
  BadgeMode,
  BadgeTone,
  Flex,
  Tooltip,
  studioTheme,
  usePrefersDark,
  type FlexJustify,
} from '@sanity/ui'
import { WarningOutlineIcon } from '@sanity/icons'

type DeployStatusProps = {
  status: string
  errorMessage?: string
  justify?: FlexJustify | FlexJustify[]
}
const DeployStatus: React.FC<DeployStatusProps> = ({
  status,
  errorMessage,
  justify,
}) => {
  const scheme = usePrefersDark() ? 'dark' : 'light'

  const getStatus = (status: string, errorMessage?: string) => {
    if (errorMessage && errorMessage.indexOf('Canceled build') >= 0) {
      return 'canceled'
    } else if (errorMessage && errorMessage.indexOf('Skipped') >= 0) {
      return 'skipped'
    } else {
      return status
    }
  }

  const badgeStatus = getStatus(status, errorMessage)?.toUpperCase()

  const badgeTone =
    ({
      NEW: 'default',
      LOADING: 'default',
      ERROR: 'critical',
      ENQUEUED: 'default',
      CANCELED: 'default',
      SKIPPED: 'default',
      READY: 'positive',
      BUILDING: 'caution',
      PREPARING: 'caution',
      PROCESSING: 'caution',
    }[badgeStatus] as BadgeTone) || 'default'

  const badgeMode =
    ({
      LOADING: 'outline',
      READY: 'outline',
      SKIPPED: 'outline',
      CANCELED: 'outline',
    }[badgeStatus] as BadgeMode) || 'default'

  return (
    <Flex wrap="nowrap" align="center" justify={justify}>
      <Badge mode={badgeMode} tone={badgeTone} padding={2} fontSize={1}>
        {badgeStatus}
      </Badge>
      {
        (errorMessage && (badgeStatus !== 'CANCELED' && badgeStatus != 'SKIPPED')) && (
          <Box marginLeft={2}>
            <Tooltip
              content={
                <Box padding={3}>
                  <Text muted size={1}>
                    {errorMessage}
                  </Text>
                </Box>
              }
              placement="top"
            >
              <WarningOutlineIcon
                fontSize={25}
                color={studioTheme.color[scheme].critical.spot.red}
                style={ { marginLeft: '2px' } } />
            </Tooltip>
          </Box>
        )
      }
    </Flex>
  )

}

export default DeployStatus
