import React from 'react'
import { Box, Label, Stack, Text } from '@sanity/ui'

interface FormFieldProps {
  title?: React.ReactNode
  description?: React.ReactNode
  children?: React.ReactNode
}

// Replaces sanity's FormField, which requires DocumentDivergencesContext
// (only available inside a document editor). This equivalent uses @sanity/ui
// primitives and works in standalone tools like the Netlify deploy panel.
const FormField: React.FC<FormFieldProps> = ({ title, description, children }) => (
  <Stack space={2}>
    {title && <Label size={1}>{title}</Label>}
    {description && <Text size={1} muted>{description}</Text>}
    <Box>{children}</Box>
  </Stack>
)

export default FormField
