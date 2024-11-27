import 'server-only'

import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  streamUI,
  createStreamableValue
} from 'ai/rsc'
import { openai } from '@ai-sdk/openai'

import {
  spinner,
  BotCard,
  BotMessage,
  SystemMessage,
  Stock,
  Purchase
} from '@/components/stocks'

import { z } from 'zod'
import { EventsSkeleton } from '@/components/stocks/events-skeleton'
import { Events } from '@/components/stocks/events'
import { StocksSkeleton } from '@/components/stocks/stocks-skeleton'
import { Stocks } from '@/components/stocks/stocks'
import { StockSkeleton } from '@/components/stocks/stock-skeleton'
import {
  formatNumber,
  runAsyncFnWithoutBlocking,
  sleep,
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage } from '@/components/stocks/message'
import { Chat, Message } from '@/lib/types'
import { auth } from '@/auth'

async function confirmPurchase(symbol: string, price: number, amount: number) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  const purchasing = createStreamableUI(
    <div className="inline-flex items-start gap-1 md:items-center">
      {spinner}
      <p className="mb-2">
        Purchasing {amount} ${symbol}...
      </p>
    </div>
  )

  const systemMessage = createStreamableUI(null)

  runAsyncFnWithoutBlocking(async () => {
    await sleep(1000)

    purchasing.update(
      <div className="inline-flex items-start gap-1 md:items-center">
        {spinner}
        <p className="mb-2">
          Purchasing {amount} ${symbol}... working on it...
        </p>
      </div>
    )

    await sleep(1000)

    purchasing.done(
      <div>
        <p className="mb-2">
          You have successfully purchased {amount} ${symbol}. Total cost:{' '}
          {formatNumber(amount * price)}
        </p>
      </div>
    )

    systemMessage.done(
      <SystemMessage>
        You have purchased {amount} shares of {symbol} at ${price}. Total cost ={' '}
        {formatNumber(amount * price)}.
      </SystemMessage>
    )

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'system',
          content: `[User has purchased ${amount} shares of ${symbol} at ${price}. Total cost = ${
            amount * price
          }]`
        }
      ]
    })
  })

  return {
    purchasingUI: purchasing.value,
    newMessage: {
      id: nanoid(),
      display: systemMessage.value
    }
  }
}

async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  const result = await streamUI({
    model: openai('gpt-3.5-turbo'),
    initial: <SpinnerMessage />,
    system: `\
    You are a bot that helps users decide which menu items to order that fits their preferences and a budget of $22.

    First, you should ask questions to get the user's name.

    After getting the user's name, please use the user's name and ask what food preferences they have.

    For example, a user may say "no cheese" or "no cilantro". A user may also say that they like "chicken".

    If the user replies with food preferences, then ask them if they have any more food preferences to make sure the user told us everything.

    Here are the menu items from Sweetgreen:
    - Harvest Bowl ($48.50): Roasted chicken, roasted sweet potatoes, apples, goat cheese, roasted almonds, wild rice, shredded kale, and balsamic vinaigrette (https://img.cdn4dd.com/cdn-cgi/image/fit=contain,width=1200,height=672,format=auto/https://doordash-static.s3.amazonaws.com/media/photosV2/5bb1c04e-6bb5-464a-98d4-a4d8e4d88fa5-retina-large.png)
    - Chicken Pesto Parm ($8.75): Roasted chicken, spicy broccoli, tomatoes, shaved parmesan, za'atar breadcrumbs, herbed quinoa, baby spinach, sweetgreen hot sauce, and pesto vinaigrette (https://img.cdn4dd.com/cdn-cgi/image/fit=contain,width=1200,height=672,format=auto/https://doordash-static.s3.amazonaws.com/media/photosV2/0cf70cb9-6784-4a07-81a8-2a2c159f6149-retina-large.png)
    - Miso Glazed Salmon ($5.95): Miso glazed salmon, avocado, cucumbers, pickled onions, crispy onions, white rice, nori sesame seasoning, and spicy cashew (https://img.cdn4dd.com/cdn-cgi/image/fit=contain,width=1200,height=672,format=auto/https://doordash-static.s3.amazonaws.com/media/photosV2/ffbbe64d-2cd9-4c7c-b5dd-ebb0b1a23118-retina-large.png)
    - Crispy Rice Bowl ($23.75): Blackened chicken, raw carrots, shredded cabbage, cucumbers, cilantro, roasted almonds, crispy rice, wild rice, arugula, lime squeeze, and spicy cashew (https://img.cdn4dd.com/cdn-cgi/image/fit=contain,width=1200,height=672,format=auto/https://doordash-static.s3.amazonaws.com/media/photosV2/ce488b63-c078-4346-9095-5be9b2691d13-retina-large.png)
    - Hot Honey Chicken ($22.50): Blackened chicken, warm roasted sweet potatoes, veg slaw, crispy onions, herbed quinoa, and hot honey mustard sauce (https://img.cdn4dd.com/cdn-cgi/image/fit=contain,width=1200,height=672,format=auto/https://doordash-static.s3.amazonaws.com/media/photosV2/652d1d38-6453-4dc7-b812-14cbe4bdb778-retina-large.png)
    - Caramelized Garlic Steak ($20.95): Grass-fed caramelized garlic steak, warm roasted sweet potatoes, spicy broccoli, tomatoes, wild rice, and pesto vinaigrette (https://img.cdn4dd.com/cdn-cgi/image/fit=contain,width=1200,height=672,format=auto/https://doordash-static.s3.amazonaws.com/media/photosV2/be6a4fdc-99d0-4640-9248-9a4a442d0246-retina-large.png)
    - Chicken Avocado Ranch ($18.25): Blackened chicken, avocado, pickled onions, apples, tortilla chips, white rice, chopped romaine, and green goddess ranch (https://img.cdn4dd.com/cdn-cgi/image/fit=contain,width=1200,height=672,format=auto/https://doordash-static.s3.amazonaws.com/media/photosV2/8dca0ade-1414-412f-99bc-a7fd7539a8af-retina-large.png)
    - Shroomami ($17.95): Roasted tofu, warm portobello mix, cucumbers, basil, shredded cabbage, roasted almonds, wild rice, shredded kale, and miso sesame ginger (https://img.cdn4dd.com/cdn-cgi/image/fit=contain,width=1200,height=672,format=auto/https://doordash-static.s3.amazonaws.com/media/photosV2/65ef0ebd-e121-4039-a53d-f60fda97f2df-retina-large.png)
    - Fish Taco ($21.75): Arugula, herbed quinoa, cilantro, shredded cabbage, tortilla chips, avocado, miso glazed salmon, lime cilantro jalapeño vinaigrette, and sweetgreen hot sauce (https://img.cdn4dd.com/cdn-cgi/image/fit=contain,width=1200,height=672,format=auto/https://doordash-static.s3.amazonaws.com/media/photosV2/22af8636-5561-436e-8cf9-cde1e7397ec6-retina-large.png)
    - Autumn Harvest Bowl ($19.95): Blackened chicken, maple glazed Brussels sprouts, roasted sweet potatoes, apples, goat cheese, roasted almonds, wild rice, shredded kale, and balsamic vinaigrette (https://img.cdn4dd.com/cdn-cgi/image/fit=contain,width=1200,height=672,format=auto/https://doordash-static.s3.amazonaws.com/media/photosV2/30df59c0-ff6e-4408-9f97-3648f1e234f6-retina-large.png)
    - Steakhouse Chopped ($20.75): Grass-fed caramelized garlic steak, crispy onions, tomatoes, blue cheese, shredded cabbage, herbed quinoa, chopped romaine, and green goddess ranch (https://img.cdn4dd.com/cdn-cgi/image/fit=contain,width=1200,height=672,format=auto/https://doordash-static.s3.amazonaws.com/media/photosV2/9b73b543-ea77-4e16-a4c2-b2aa291199a9-retina-large.png)

    Please use the user's food preferences to only suggest items that 1) match the food preferences and 2) have a price less than $22.00.

    Please return the answer in the following format:

    [insert food name] | [insert price] | description;

    Do not list more than 5 items at once.

    `,
    messages: [
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    text: ({ content, done, delta }) => {
      if (!textStream) {
        textStream = createStreamableValue('')
        textNode = <BotMessage content={textStream.value} />
      }

      if (done) {
        textStream.done()
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(delta)
      }

      return textNode
    },
    tools: {
      // listStocks: {
      //   description: 'List three imaginary stocks that are trending.',
      //   parameters: z.object({
      //     stocks: z.array(
      //       z.object({
      //         symbol: z.string().describe('The symbol of the stock'),
      //         price: z.number().describe('The price of the stock'),
      //         delta: z.number().describe('The change in price of the stock')
      //       })
      //     )
      //   }),
      //   generate: async function* ({ stocks }) {
      //     yield (
      //       <BotCard>
      //         <StocksSkeleton />
      //       </BotCard>
      //     )
      //
      //     await sleep(1000)
      //
      //     const toolCallId = nanoid()
      //
      //     aiState.done({
      //       ...aiState.get(),
      //       messages: [
      //         ...aiState.get().messages,
      //         {
      //           id: nanoid(),
      //           role: 'assistant',
      //           content: [
      //             {
      //               type: 'tool-call',
      //               toolName: 'listStocks',
      //               toolCallId,
      //               args: { stocks }
      //             }
      //           ]
      //         },
      //         {
      //           id: nanoid(),
      //           role: 'tool',
      //           content: [
      //             {
      //               type: 'tool-result',
      //               toolName: 'listStocks',
      //               toolCallId,
      //               result: stocks
      //             }
      //           ]
      //         }
      //       ]
      //     })
      //
      //     return (
      //       <BotCard>
      //         <Stocks props={stocks} />
      //       </BotCard>
      //     )
      //   }
      // },
      // showStockPrice: {
      //   description:
      //     'Get the current stock price of a given stock or currency. Use this to show the price to the user.',
      //   parameters: z.object({
      //     symbol: z
      //       .string()
      //       .describe(
      //         'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
      //       ),
      //     price: z.number().describe('The price of the stock.'),
      //     delta: z.number().describe('The change in price of the stock')
      //   }),
      //   generate: async function* ({ symbol, price, delta }) {
      //     yield (
      //       <BotCard>
      //         <StockSkeleton />
      //       </BotCard>
      //     )
      //
      //     await sleep(1000)
      //
      //     const toolCallId = nanoid()
      //
      //     aiState.done({
      //       ...aiState.get(),
      //       messages: [
      //         ...aiState.get().messages,
      //         {
      //           id: nanoid(),
      //           role: 'assistant',
      //           content: [
      //             {
      //               type: 'tool-call',
      //               toolName: 'showStockPrice',
      //               toolCallId,
      //               args: { symbol, price, delta }
      //             }
      //           ]
      //         },
      //         {
      //           id: nanoid(),
      //           role: 'tool',
      //           content: [
      //             {
      //               type: 'tool-result',
      //               toolName: 'showStockPrice',
      //               toolCallId,
      //               result: { symbol, price, delta }
      //             }
      //           ]
      //         }
      //       ]
      //     })
      //
      //     return (
      //       <BotCard>
      //         <Stock props={{ symbol, price, delta }} />
      //       </BotCard>
      //     )
      //   }
      // },
      // showStockPurchase: {
      //   description:
      //     'Show price and the UI to purchase a stock or currency. Use this if the user wants to purchase a stock or currency.',
      //   parameters: z.object({
      //     symbol: z
      //       .string()
      //       .describe(
      //         'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
      //       ),
      //     price: z.number().describe('The price of the stock.'),
      //     numberOfShares: z
      //       .number()
      //       .optional()
      //       .describe(
      //         'The **number of shares** for a stock or currency to purchase. Can be optional if the user did not specify it.'
      //       )
      //   }),
      //   generate: async function* ({ symbol, price, numberOfShares = 100 }) {
      //     const toolCallId = nanoid()
      //
      //     if (numberOfShares <= 0 || numberOfShares > 1000) {
      //       aiState.done({
      //         ...aiState.get(),
      //         messages: [
      //           ...aiState.get().messages,
      //           {
      //             id: nanoid(),
      //             role: 'assistant',
      //             content: [
      //               {
      //                 type: 'tool-call',
      //                 toolName: 'showStockPurchase',
      //                 toolCallId,
      //                 args: { symbol, price, numberOfShares }
      //               }
      //             ]
      //           },
      //           {
      //             id: nanoid(),
      //             role: 'tool',
      //             content: [
      //               {
      //                 type: 'tool-result',
      //                 toolName: 'showStockPurchase',
      //                 toolCallId,
      //                 result: {
      //                   symbol,
      //                   price,
      //                   numberOfShares,
      //                   status: 'expired'
      //                 }
      //               }
      //             ]
      //           },
      //           {
      //             id: nanoid(),
      //             role: 'system',
      //             content: `[User has selected an invalid amount]`
      //           }
      //         ]
      //       })
      //
      //       return <BotMessage content={'Invalid amount'} />
      //     } else {
      //       aiState.done({
      //         ...aiState.get(),
      //         messages: [
      //           ...aiState.get().messages,
      //           {
      //             id: nanoid(),
      //             role: 'assistant',
      //             content: [
      //               {
      //                 type: 'tool-call',
      //                 toolName: 'showStockPurchase',
      //                 toolCallId,
      //                 args: { symbol, price, numberOfShares }
      //               }
      //             ]
      //           },
      //           {
      //             id: nanoid(),
      //             role: 'tool',
      //             content: [
      //               {
      //                 type: 'tool-result',
      //                 toolName: 'showStockPurchase',
      //                 toolCallId,
      //                 result: {
      //                   symbol,
      //                   price,
      //                   numberOfShares
      //                 }
      //               }
      //             ]
      //           }
      //         ]
      //       })
      //
      //       return (
      //         <BotCard>
      //           <Purchase
      //             props={{
      //               numberOfShares,
      //               symbol,
      //               price: +price,
      //               status: 'requires_action'
      //             }}
      //           />
      //         </BotCard>
      //       )
      //     }
      //   }
      // },
      // getEvents: {
      //   description:
      //     'List funny imaginary events between user highlighted dates that describe stock activity.',
      //   parameters: z.object({
      //     events: z.array(
      //       z.object({
      //         date: z
      //           .string()
      //           .describe('The date of the event, in ISO-8601 format'),
      //         headline: z.string().describe('The headline of the event'),
      //         description: z.string().describe('The description of the event')
      //       })
      //     )
      //   }),
      //   generate: async function* ({ events }) {
      //     yield (
      //       <BotCard>
      //         <EventsSkeleton />
      //       </BotCard>
      //     )
      //
      //     await sleep(1000)
      //
      //     const toolCallId = nanoid()
      //
      //     aiState.done({
      //       ...aiState.get(),
      //       messages: [
      //         ...aiState.get().messages,
      //         {
      //           id: nanoid(),
      //           role: 'assistant',
      //           content: [
      //             {
      //               type: 'tool-call',
      //               toolName: 'getEvents',
      //               toolCallId,
      //               args: { events }
      //             }
      //           ]
      //         },
      //         {
      //           id: nanoid(),
      //           role: 'tool',
      //           content: [
      //             {
      //               type: 'tool-result',
      //               toolName: 'getEvents',
      //               toolCallId,
      //               result: events
      //             }
      //           ]
      //         }
      //       ]
      //     })
      //
      //     return (
      //       <BotCard>
      //         <Events props={events} />
      //       </BotCard>
      //     )
      //   }
      // }
    }
  })

  return {
    id: nanoid(),
    display: result.value
  }
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    confirmPurchase
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState() as Chat

      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },
  onSetAIState: async ({ state }) => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`

      const firstMessageContent = messages[0].content as string
      const title = firstMessageContent.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'tool' ? (
          message.content.map(tool => {
            return tool.toolName === 'listStocks' ? (
              <BotCard>
                {/* TODO: Infer types based on the tool result*/}
                {/* @ts-expect-error */}
                <Stocks props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPrice' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Stock props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPurchase' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Purchase props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'getEvents' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Events props={tool.result} />
              </BotCard>
            ) : null
          })
        ) : message.role === 'user' ? (
          <UserMessage>{message.content as string}</UserMessage>
        ) : message.role === 'assistant' &&
          typeof message.content === 'string' ? (
          <BotMessage content={message.content} />
        ) : null
    }))
}
