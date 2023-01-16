import { ActivityHandler, CardFactory, MessageFactory, TurnContext } from "botbuilder";
import * as ACData from "adaptivecards-templating";
import * as AnswerCard from "../cards/Answer.json";
import * as WelcomeCard from "../cards/WelcomeCard.json";
import { Configuration, OpenAIApi } from "openai";
import * as fs from "fs";
import * as csv from "csv-writer";

export class OpenAiBot extends ActivityHandler {
    constructor() {
        super();

        this.onMessage(async (context, next) => {

            const configuration = new Configuration({
                apiKey: process.env.OPENAI_API_KEY,
            });
            const openai = new OpenAIApi(configuration);

            const completion = await openai.createCompletion({
                prompt: context.activity.text,
                model: process.env.OPENAI_MODEL,
                max_tokens: Number(process.env.OPENAI_MAX_TOKENS),
                temperature: Number(process.env.OPENAI_TEMPERATURE),
            });

            // Create data for card
            const cardData = {
                answer: completion.data.choices[0].text
            }

            const template = new ACData.Template(AnswerCard);
            const cardPayload = template.expand({ $root: cardData });
            const card = CardFactory.adaptiveCard(cardPayload);

            await context.sendActivity(MessageFactory.attachment(card));

            const csvwriter = csv.createObjectCsvWriter({
                path: process.env.LOGCSV,
                header: [
                    {id: "question", title: "Frage"},
                    {id: "answer", title: "Antwort"}
                ],
                append: true
            });
            const csvdata = [{question: context.activity.text, answer: completion.data.choices[0].text}];
            csvwriter.writeRecords(csvdata)       // returns a promise

            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const card = CardFactory.adaptiveCard(WelcomeCard);
            for (const member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    await context.sendActivity(MessageFactory.attachment(card));
                }
            }
            await next();
        });
    }
}