
import {
    ArgExpression,
    VariableExpression,
    MethodExpression,
    ConditionExpression,
    BlockExpression,
    IfExpression,
    ForExpression,
    SetExpression,
    TrimExpression,
    NlExpression,
    PrintExpression,
    ConfExpression,
} from './types';

export type Variables = {
    [key in string]: Variables | string | Variables[] | string[];
};

export type Variable = Variables | string | Variables[] | string[];

export type Methods = Record<string, (arg: Variable, params: Record<string, string>) => Variable>;

export type Block =
    | {
        type: 'string';
        content: string;
    }
    | {
        type: 'value';
        content: string;
    }
    | {
        type: 'trim';
        direction: 'left' | 'right' | 'both';
        content: string;
    }
    | {
        type: 'conf';
        identificator: string;
        value: string;
        content: string;
    };

export type RenderOptions = {
    squash: 'on' | 'off';
};

class Executor {
    private values: Variables[];

    private methods: Methods;

    private renderOptions: RenderOptions = {
        squash: 'on',
    };

    constructor(values: Variables = {}, methods: Methods = {}) {
        this.values = [values, {}];
        this.methods = methods;
    }

    setRenderOptions(renderOptions: RenderOptions): void {
        this.renderOptions = renderOptions;
    }

    private getValue(root: string, parts: (string | ArgExpression)[]): Variable {
        for (let i = this.values.length - 1; i >= 0; i--) {
            const values = this.values[i];
            const value = parts.reduce((variables, part) => {
                if (!variables || typeof variables === 'string') {
                    return undefined;
                }
                const identificator = typeof part === 'string'
                    ? part
                    : this.calcArgAsString(part);
                if (Array.isArray(variables)) {
                    return variables[Number(identificator)];
                }
                return variables[identificator];
            }, values[root] as Variables | undefined);
            if (value !== undefined) {
                return value;
            }
        }
        return '';
    }

    private pushVariables(values: Variables): void {
        this.values.push(values);
    }

    private popVariables(): Variables | undefined {
        return this.values.pop();
    }

    private replaceVariables(values: Variables): void {
        this.values[this.values.length - 1] = values;
    }

    private getVariables(): Variables {
        return this.values[this.values.length - 1];
    }

    calcMethod(expression: MethodExpression, value: Variable): Variable {
        const method = this.methods[expression.function];
        const methodParams = expression.params.reduce((params, param) => {
            params[param.key] = param.value ? this.calcArgAsString(param.value) : '';
            return params;
        }, {} as Record<string, string>);
        return method(value, methodParams);
    }

    calcVariable(expression: VariableExpression): Variable {
        return this.getValue(expression.root, expression.parts);
    }

    calcArg(expression: ArgExpression): Variable {
        const value = expression.value.type === 'text' ? expression.value.text : this.calcVariable(expression.value.variable);
        const newValue = expression.methods.reduce((prevValue, method) => this.calcMethod(method, prevValue), value);
        return newValue;
    }

    calcArgAsString(expression: ArgExpression): string {
        return String(this.calcArg(expression));
    }

    calcCondition(expression: ConditionExpression): boolean {
        if (expression.condition.type === 'arg') {
            return this.calcArg(expression.condition.arg) !== '';
        }
        if (expression.condition.type === 'brackets') {
            return this.calcCondition(expression.condition.condition);
        }
        if (expression.condition.type === 'and') {
            return this.calcCondition(expression.condition.conditionLeft)
                && this.calcCondition(expression.condition.conditionRight);
        }
        if (expression.condition.type === 'or') {
            return this.calcCondition(expression.condition.conditionLeft)
                || this.calcCondition(expression.condition.conditionRight);
        }
        if (expression.condition.type === 'eq') {
            return (
                this.calcArg(expression.condition.argLeft)
                === this.calcArg(expression.condition.argRight)
            ) !== expression.condition.not;
        }
        if (expression.condition.type === 'like') {
            const left = this.calcArgAsString(expression.condition.argLeft);
            const right = this.calcArgAsString(expression.condition.argRight);
            return new RegExp(`^${right.replace(/%/g, '.*')}$`).test(left)
                !== expression.condition.not;
        }
        if (expression.condition.type === 'in') {
            const left = this.calcArg(expression.condition.arg);
            const array = expression.condition.array.map((arg) => this.calcArg(arg));
            return array.includes(left) !== expression.condition.not;
        }
        return false;
    }

    calcBlock(expression: BlockExpression): Block[] {
        if (typeof expression === 'string') {
            return [{
                type: 'string',
                content: expression,
            }];
        }
        if (expression.type === 'if') {
            return this.calcIf(expression);
        }
        if (expression.type === 'for') {
            return this.calcFor(expression);
        }
        if (expression.type === 'set') {
            return this.calcSet(expression);
        }
        if (expression.type === 'trim') {
            return this.calcTrim(expression);
        }
        if (expression.type === 'nl') {
            return this.calcNl(expression);
        }
        if (expression.type === 'print') {
            return this.calcPrint(expression);
        }
        if (expression.type === 'conf') {
            return this.calcConf(expression);
        }
        return [];
    }

    calcBlocks(expressions: BlockExpression[]): Block[] {
        const calcedBlocks = expressions.reduce((blocks, expression) => {
            return blocks.concat(this.calcBlock(expression));
        }, [] as Block[]);
        return calcedBlocks;
    }

    render(expressions: BlockExpression[]): string {
        const currentRenderOptions = { ...this.renderOptions };
        const calcedBlocks = this.calcBlocks(expressions)
            .reduce((blocks, block) => {
                if (block.type !== 'string') {
                    blocks.push(block);
                } else if (blocks.length && blocks[blocks.length - 1].type === 'string') {
                    blocks[blocks.length - 1].content += block.content;
                } else {
                    blocks.push(block);
                }
                return blocks;
            }, [] as Block[]);

        calcedBlocks.forEach((block, i, arr) => {
            if (block.type === 'trim') {
                if (block.direction === 'both' || block.direction === 'left') {
                    if (arr[i - 1]) {
                        arr[i - 1].content = arr[i - 1].content.trimRight();
                    }
                }
                if (block.direction === 'both' || block.direction === 'right') {
                    if (arr[i + 1]) {
                        arr[i + 1].content = arr[i + 1].content.trimLeft();
                    }
                }
            }
        });
        
        return calcedBlocks
            .map((block, i, arr) => {
                if (block.type === 'conf') {
                    switch (block.identificator) {
                        case 'squash': {
                            if (block.value === 'on') {
                                currentRenderOptions.squash = 'on';
                            } else if (block.value === 'off') {
                                currentRenderOptions.squash = 'off';
                            }
                            break;
                        }
                        default: break;
                    }
                    return block.content;
                }
                if (block.type !== 'string') {
                    return block.content;
                }
                let { content } = block;
                if (currentRenderOptions.squash === 'on') {
                    content = content
                        .replace(/\s{2,}/mg, () => ' ')
                        .replace(/\n/mg, () => '');
                }
                if (i === 0) {
                    content = content.trimLeft();
                }
                if (i === arr.length - 1) {
                    content = content.trimRight();
                }
                return content;
            })
            .join('');
    }

    check(expression: ConditionExpression): boolean {
        return this.calcCondition(expression);
    }

    calcIf(expression: IfExpression): Block[] {
        if (this.calcCondition(expression.condition)) {
            this.pushVariables({ });
            const innerBlocks = this.calcBlocks(expression.blocks);
            this.popVariables();
            return innerBlocks;
        }
        return [];
    }

    calcFor(expression: ForExpression): Block[] {
        if (expression.subtype.type === 'in') {
            const from = Number(this.calcArg(expression.subtype.from));
            const to = Number(this.calcArg(expression.subtype.to));
            const blocks: Block[] = [];
            for (let i = from; i < to; i++) {
                this.pushVariables({ [expression.identificator]: String(i) });
                const innerBlocks = this.calcBlocks(expression.blocks);
                this.popVariables();
                blocks.push(...innerBlocks);
            }
            return blocks;
        }

        return expression.subtype.array.reduce((blocks, argExpression) => {
            const value = this.calcArg(argExpression);
            this.pushVariables({ [expression.identificator]: value });
            const innerBlocks = this.calcBlocks(expression.blocks);
            this.popVariables();
            return blocks.concat(innerBlocks);
        }, [] as Block[]);
    }

    calcSet(expression: SetExpression): Block[] {
        if (expression.arg.value.type === 'text') {
            this.getVariables()[expression.identificator] = expression.arg.value.text;
        } else {
            this.getVariables()[expression.identificator] = this.calcArg(expression.arg);
        }
        return [];
    }

    calcConf(expression: ConfExpression): Block[] {
        return [{
            type: 'conf',
            identificator: expression.identificator,
            value: expression.arg.value.type === 'text' ? expression.arg.value.text : this.calcArgAsString(expression.arg),
            content: '',
        }];
    }

    calcTrim(expression: TrimExpression): Block[] {
        return [{
            type: 'trim',
            direction: expression.direction,
            content: '',
        }];
    }

    calcNl(expression: NlExpression): Block[] {
        return [{
            type: 'value',
            content: '\n',
        }];
    }

    calcPrint(expression: PrintExpression): Block[] {
        return [{
            type: 'value',
            content: this.calcArgAsString(expression.arg),
        }];
    }
}

export default Executor;
