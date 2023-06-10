import { LLMChain } from "langchain/chains";
import { PromptTemplate } from 'langchain/prompts';
import { BaseLanguageModel } from 'langchain/base_language';
import { Document } from 'langchain/document';


const ANIMATION_SUFFIX =
    'In addition, what animation state should {agent_name} be in as part of the reaction to the observation?'
    + 'Respond in a new line. Write:\nANIMATION STATE: [animation state].\n\n';

function stripBracketsFromAnimationState(state: string) {
    const x = state.replace("[", "").replace("]", "").trim();
    if (x.endsWith(".")) {
        return x.slice(0, -1);
    }
    return x;
}

// class for generative agent
export class GenerativeAgent {
    name: string;
    age: number;
    traits: string;
    llm: BaseLanguageModel;
    currentAnimation: string;
    animations: string[];

    // memory
    memory: any = [];

    // constructor
    constructor(kwargs: {
        name: string,
        age: number,
        traits: string,
        llm: BaseLanguageModel,
        currentAnimation: string,
        animations: string[],

    }) {
        this.name = kwargs.name;
        this.age = kwargs.age;
        this.traits = kwargs.traits;
        this.llm = kwargs.llm;
        this.currentAnimation = kwargs.currentAnimation;
        this.animations = kwargs.animations;
    }

    addMemory(memory_content: string) {
        const document = new Document({ pageContent: memory_content, metadata: {} });
        this.memory.push(document);
    }

    // TODO: return recent observations without going over the token limit
    getRecentObservations() {
        let recent_observations = "";

        // loop backwards so recent memories in front
        for (let i = this.memory.length - 1; i >= 0; i--) {
            recent_observations += this.memory[i].pageContent + "; ";
        }

        return recent_observations;
    }

    getSummary(): string {
        let animationStates = "";
        for (let i = 0; i < this.animations.length; i++) {
            animationStates += "[" + this.animations[i] + "]";
            if (i < this.animations.length - 1) {
                animationStates += ", ";
            }
        }
        const summary = `${this.name} is a human with an avatar in a virtual 3D world. `
            + `${this.name} is not aware it is an avatar and thinks it is in the real world.`
            + `The avatar can change its animation state. ` 
            + `The avatar can be in the following animation states: ${animationStates}. `
            + `The default animation state is [Idle].`;
        return (
            `Name: ${this.name} (age: ${this.age})`
            + `\nInnate traits: ${this.traits}`
            + `\nSummary: ${summary}`
            + `\nCurrent animation state: [${this.currentAnimation}]`
        );
    }

    /**
     * React to a given observation.
     */
    async _generateReaction(observation: string, suffix: string): Promise<string> {
        const prompt = PromptTemplate.fromTemplate(
            "{agent_summary_description}"
            + "\nIt is {current_time}."
            + "\nMost recent observations: {recent_observations}"
            + "\nObservation: {observation}"
            + "\n\n" + suffix
        );
        const agent_summary_description = this.getSummary();
        const current_time_str = new Date().toLocaleString("en-US", { month: "long", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
        const kwargs = {
            agent_summary_description: agent_summary_description,
            current_time: current_time_str,
            agent_name: this.name,
            observation: observation,
            recent_observations: "",
        };
        kwargs["recent_observations"] = this.getRecentObservations();
        const action_prediction_chain = new LLMChain({ llm: this.llm, prompt: prompt });

        console.log('_generateReaction kwargs:');
        console.log(kwargs);

        const result = await action_prediction_chain.call(kwargs);

        console.log('_generateReaction call result:');
        console.log(result);

        return result.text.trim();
    }

    async generateReaction(observation: string): Promise<[boolean, string, string]> {
        const call_to_action_template = (
            "Should {agent_name} react to the observation, and if so,"
            + " what would be an appropriate reaction? Respond in one line."
            + ' If the action is to engage in dialogue, write:\nSAY: "what to say"'
            + "\notherwise, write:\nREACT: {agent_name}'s reaction (if anything)."
            + "\nEither do nothing, react, or say something but not both.\n\n"
            + ANIMATION_SUFFIX
        );
        const full_result = await this._generateReaction(observation, call_to_action_template);
        const result = full_result.trim().split('\n')[0];
        const result2 = full_result.trim().split('\n')[1];

        let animationState = this.currentAnimation;
        if (result2 && result2.includes("ANIMATION STATE:")) {
            // @ts-ignore
            animationState = result2.split("ANIMATION STATE:").pop().trim();

            this.currentAnimation = stripBracketsFromAnimationState(animationState);
        }

        this.addMemory(`${this.name} observed ${observation} and reacted by ${result} with animation state ${animationState}`);
        if (result.includes("REACT:")) {
            // @ts-ignore
            const reaction = result.split("REACT:").pop().trim();
            return [false, `${this.name}: ${reaction} with animation state ${animationState}`, animationState];
        }
        if (result.includes("SAY:")) {
            // @ts-ignore
            const said_value = result.split("SAY:").pop().trim();
            return [true, `${this.name} said ${said_value} with animation state ${animationState}`, animationState];
        } else {
            return [false, result + ` with animation state ${animationState}`, animationState];
        }
    }

    async generateDialogueResponse(observation: string): Promise<[boolean, string, string]> {
        const call_to_action_template = (
            'What would {agent_name} say? To end the conversation, write: GOODBYE: "what to say". Otherwise to continue the conversation, write: SAY: "what to say next"\n\n'
            + ANIMATION_SUFFIX
        );
        const full_result = await this._generateReaction(observation, call_to_action_template);
        const result = full_result.trim().split('\n')[0];
        const result2 = full_result.trim().split('\n')[1];

        let animationState = this.currentAnimation;
        if (result2 && result2.includes("ANIMATION STATE:")) {
            // @ts-ignore
            animationState = result2.split("ANIMATION STATE:").pop().trim();

            this.currentAnimation = stripBracketsFromAnimationState(animationState);
        }

        if (result.includes("GOODBYE:")) {
            // @ts-ignore
            const farewell = result.split("GOODBYE:").pop().trim();
            this.addMemory(`${this.name} observed ${observation} and said ${farewell} with animation state ${animationState}`);
            return [false, `${this.name} said ${farewell} with animation state ${animationState}`, animationState];
        }
        if (result.includes("SAY:")) {
            // @ts-ignore
            const response_text = result.split("SAY:").pop().trim();
            this.addMemory(`${this.name} observed ${observation} and said ${response_text} with animation state ${animationState}`);
            return [true, `${this.name} said ${response_text} with animation state ${animationState}`, animationState];
        } else {
            return [false, result + ` with animation state ${animationState}`, animationState];
        }
    }
}