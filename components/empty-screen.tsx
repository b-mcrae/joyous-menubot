import { UseChatHelpers } from 'ai/react'

import { Button } from '@/components/ui/button'
import { ExternalLink } from '@/components/external-link'
import { IconArrowRight } from '@/components/ui/icons'

export function EmptyScreen() {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="flex flex-col gap-2 rounded-lg border bg-background p-8">
        <h1 className="text-lg font-semibold">
          Menu Bot 🤖🍟
        </h1>
        <p className="leading-normal text-muted-foreground">
          Today, we're ordering food from{' '}
          <ExternalLink href="https://www.doordash.com/store/sweetgreen-san-mateo-245875/?cursor=eyJzZWFyY2hfaXRlbV9jYXJvdXNlbF9jdXJzb3IiOnsicXVlcnkiOiJzd2VldGdyZWVuIiwiaXRlbV9pZHMiOltdLCJzZWFyY2hfdGVybSI6InN3ZWV0Z3JlZW4iLCJ2ZXJ0aWNhbF9pZCI6LTk5OSwidmVydGljYWxfbmFtZSI6ImFsbCJ9LCJzdG9yZV9wcmltYXJ5X3ZlcnRpY2FsX2lkcyI6WzEsNCwxNzYsMTc3LDE3OSwxOTYsMjg0XX0=&pickup=false">sweetgreen</ExternalLink>
          , a restaurant that serves healthy fast food!
        </p>
        <p className="leading-normal text-muted-foreground">
          Let me help find you some menu suggestions that fit your preferences.
        </p>
      </div>
    </div>
  )
}
