// eslint-disable-next-line max-classes-per-file
import Reader from '../Reader';
import {
    TextExpression,
    ArgExpression,
    VariableExpression,
    MethodExpression,
    ParamExpression,
    ConditionExpression,
    BlockExpression,
    IfExpression,
    ForExpression,
    SetExpression,
    TrimExpression,
    NlExpression,
    ConfExpression,
    PrintExpression,
} from '../types';
import Parser from './Parser';

export class StringParser extends Parser<string> {
    private stop: RegExp;

    constructor(reader: Reader, stop: RegExp) {
        super(reader);
        this.stop = stop;
    }

    parse(): string {
        return this.readWhile(() => this.reader.test(1).search(this.stop) === -1);
    }
}

export class SpaceParser extends Parser<string> {
    parse(): string {
        return this.readWhile(() => this.reader.test(1).trim().length === 0);
    }
}

const START_SYMBOLS = '{{';
const END_SYMBOLS = '}}';

export class StartOpenDirectiveParser extends Parser<string> {
    private directive: string;

    constructor(reader: Reader, directive: string) {
        super(reader);
        this.directive = directive;
    }

    test(): boolean {
        const prefix = this.reader.test(START_SYMBOLS.length + this.directive.length);
        return prefix === `${START_SYMBOLS}${this.directive}`;
    }

    parse(): string {
        const text = this.reader.read(START_SYMBOLS.length + this.directive.length);
        if (text !== `${START_SYMBOLS}${this.directive}`) {
            throw new Error(this.reader.makeErrorMessage(`Wrong start directive "${text}"`, this.directive.length, 0 - START_SYMBOLS.length - this.directive.length));
        }
        return this.directive;
    }
}

export class StartCloseDirectiveParser extends Parser<string> {
    test(): boolean {
        const prefix = this.reader.test(END_SYMBOLS.length);
        return prefix === END_SYMBOLS;
    }

    parse(): string {
        const text = this.reader.read(END_SYMBOLS.length);
        if (text !== END_SYMBOLS) {
            throw new Error(this.reader.makeErrorMessage(`Wrong close directive "${text}"`, END_SYMBOLS.length, 0 - END_SYMBOLS.length));
        }
        return text;
    }
}

export class EndDirectiveParser extends Parser<string> {
    private directive: string;

    constructor(reader: Reader, directive: string) {
        super(reader);
        this.directive = directive;
    }

    test(): boolean {
        const prefix = this.reader.test(START_SYMBOLS.length + 1 + this.directive.length + END_SYMBOLS.length);
        return prefix === `${START_SYMBOLS}/${this.directive}${END_SYMBOLS}`;
    }

    parse(): string {
        const text = this.reader.read(START_SYMBOLS.length + 1 + this.directive.length + END_SYMBOLS.length);
        if (text !== `${START_SYMBOLS}/${this.directive}${END_SYMBOLS}`) {
            throw new Error(this.reader.makeErrorMessage(`Wrong end directive "${text}"`, this.directive.length, 0 - START_SYMBOLS.length - 1 - this.directive.length - 1));
        }
        return this.directive;
    }
}

export class UnknownStartDirectiveParser extends Parser<string> {
    test(): boolean {
        const prefix = this.reader.test(START_SYMBOLS.length);
        return prefix === START_SYMBOLS;
    }

    parse(): string {
        this.reader.read(START_SYMBOLS.length);
        const text = this.readWhile(() => ![' ', END_SYMBOLS[0]].includes(this.reader.test(1)));
        this.reader.read(END_SYMBOLS.length);
        return text;
    }
}

export class UnknownEndDirectiveParser extends Parser<string> {
    test(): boolean {
        const prefix = this.reader.test(START_SYMBOLS.length + 1);
        return prefix === `${START_SYMBOLS}/`;
    }

    parse(): string {
        this.reader.read(START_SYMBOLS.length + 1);
        const text = this.readWhile(() => this.reader.test(1) !== END_SYMBOLS[0]);
        this.reader.read(END_SYMBOLS.length);
        return text;
    }
}

export class TextParser extends Parser<TextExpression> {
    test(): boolean {
        const quote = this.reader.test(1);
        return quote === '"' || quote === '\'';
    }

    parse(): TextExpression {
        const quote = this.reader.read(1);
        if (quote !== '"' && quote !== '\'') {
            throw new Error(this.reader.makeErrorMessage(`Wrong symbol "${quote}"`, 1, 0 - 1));
        }
        const text = this.readWhile((buffer) => {
            return this.reader.test(1) !== quote || buffer[buffer.length - 1] === '\\';
        });
        this.reader.read(1);
        return {
            type: 'text',
            text: text.replace(/\\/g, ''),
        };
    }
}

const RE_NOT_IDENTIFICATOR_SYMBOLS = /[^a-zA-Z_]/;
const RE_NOT_IDENTIFICATOR_SYMBOLS_EXT = /[^a-zA-Z_0-9]/;

export class IdentificatorParser extends Parser<string> {
    test(): boolean {
        return this.reader.test().match(RE_NOT_IDENTIFICATOR_SYMBOLS) === null;
    }

    parse(): string {
        const prefix = this.reader.read(1);
        return prefix + new StringParser(this.reader, RE_NOT_IDENTIFICATOR_SYMBOLS_EXT).parse();
    }
}

// export class ArgParser extends Parser<ArgExpression> {
//     private parsers?: { value: Parser<ValueExpression> };

//     init(value: Parser<ValueExpression>): void {
//         this.parsers = {
//             value,
//         };
//     }

//     test(): boolean {
//         if (!this.parsers) {
//             throw new Error('Must be inited');
//         }
//         return this.parsers.value.test();// || new TextParser(this.reader).test();
//     }

//     parse(): ArgExpression {
//         if (!this.parsers) {
//             throw new Error('Must be inited');
//         }
//         // const textParser = new TextParser(this.reader);
//         // if (textParser.test()) {
//         //     return textParser.parse();
//         // }
//         return this.parsers.value.parse();
//     }
// }

export class ArrayParser extends Parser<ArgExpression[]> {
    private parsers?: { arg: Parser<ArgExpression> };

    init(arg: Parser<ArgExpression>): void {
        this.parsers = {
            arg,
        };
    }

    test(): boolean {
        if (!this.parsers) {
            throw new Error('Must be inited');
        }
        return this.reader.test(1) === '[';
    }

    parse(): ArgExpression[] {
        if (!this.parsers) {
            throw new Error('Must be inited');
        }
        const prefix = this.reader.read(1);
        if (prefix !== '[') {
            throw new Error(this.reader.makeErrorMessage(`Wrong string "${prefix}"`, 1, 0 - 1));
        }
        const array: ArgExpression[] = [];
        while (this.reader.test(1) === ',' || array.length === 0) {
            if (this.reader.test(1) === ',') {
                this.reader.read(1);
            }
            new SpaceParser(this.reader).parse();
            const arg = this.parsers.arg.parse();
            array.push(arg);
            new SpaceParser(this.reader).parse();
        }
        const suffix = this.reader.read(1);
        if (suffix !== ']') {
            throw new Error(this.reader.makeErrorMessage(`Wrong string "${prefix}"`, 1, 0 - 1));
        }

        return array;
    }
}

export class VariableParser extends Parser<VariableExpression> {
    private parsers?: { arg: Parser<ArgExpression> };

    init(arg: Parser<ArgExpression>): void {
        this.parsers = {
            arg,
        };
    }

    test(): boolean {
        return new IdentificatorParser(this.reader).test();
    }

    parse(): VariableExpression {
        if (!this.parsers) {
            throw new Error('Must be inited');
        }
        const root = new IdentificatorParser(this.reader).parse();
        if (root === '') {
            throw new Error(this.reader.makeErrorMessage('Empty identificator', 1, 0));
        }
        const parts: (string | ArgExpression)[] = [];
        while (this.reader.test(1) === '[' || this.reader.test(1) === '.') {
            if (this.reader.test(1) === '.') {
                this.reader.read(1);
                const part = new IdentificatorParser(this.reader).parse();
                if (part === '') {
                    throw new Error(this.reader.makeErrorMessage('Empty identificator', 1, 0));
                }
                parts.push(part);
            } else {
                this.reader.read(1);
                new SpaceParser(this.reader).parse();
                const arg = this.parsers.arg.parse();
                parts.push(arg);
                new SpaceParser(this.reader).parse();
                const suffix = this.reader.read(1);
                if (suffix !== ']') {
                    throw new Error(this.reader.makeErrorMessage(`Wrong string "${suffix}"`, 1, 0 - 1));
                }
            }
        }

        return {
            type: 'variable',
            root,
            parts,
        };
    }
}

export class ArgParser extends Parser<ArgExpression> {
    private parsers?: { variable: Parser<VariableExpression>, method: Parser<MethodExpression> };

    init(variable: Parser<VariableExpression>, method: Parser<MethodExpression>): void {
        this.parsers = {
            variable,
            method,
        };
    }

    test(): boolean {
        return new TextParser(this.reader).test() || new IdentificatorParser(this.reader).test();
    }

    parse(): ArgExpression {
        if (!this.parsers) {
            throw new Error('Must be inited');
        }
        let value: ArgExpression['value'];
        new SpaceParser(this.reader).parse();
        if (new TextParser(this.reader).test()) {
            value = {
                type: 'text',
                text: new TextParser(this.reader).parse().text,
            };
        } else {
            value = {
                type: 'variable',
                variable: this.parsers.variable.parse(),
            };
        }
        new SpaceParser(this.reader).parse();
        const methods: MethodExpression[] = [];
        while (this.reader.test(2) === '->') {
            this.reader.read(2);
            new SpaceParser(this.reader).parse();
            const method = this.parsers.method.parse();
            methods.push(method);
            new SpaceParser(this.reader).parse();
        }

        return {
            type: 'arg',
            value,
            methods,
        };
    }
}

export class ParamParser extends Parser<ParamExpression> {
    private parsers?: { arg: Parser<ArgExpression> };

    init(arg: Parser<ArgExpression>): void {
        this.parsers = {
            arg,
        };
    }

    test(): boolean {
        if (!this.parsers) {
            throw new Error('Must be inited');
        }
        return new IdentificatorParser(this.reader).test();
    }

    parse(): ParamExpression {
        if (!this.parsers) {
            throw new Error('Must be inited');
        }
        const key = new IdentificatorParser(this.reader).parse();
        if (key.length === 0) {
            throw new Error(this.reader.makeErrorMessage('Empty param', 1, 0));
        }
        new SpaceParser(this.reader).parse();
        let value;
        if (this.reader.test(1) === '=') {
            this.reader.read(1);
            new SpaceParser(this.reader).parse();
            value = this.parsers.arg.parse();
        }
        return {
            type: 'param',
            key,
            value,
        };
    }
}

export class MethodParser extends Parser<MethodExpression> {
    private parsers?: { param: Parser<ParamExpression> };

    init(param: Parser<ParamExpression>): void {
        this.parsers = {
            param,
        };
    }

    parse(): MethodExpression {
        if (!this.parsers) {
            throw new Error('Must be inited');
        }
        const name = new IdentificatorParser(this.reader).parse();
        if (name === '') {
            throw new Error(this.reader.makeErrorMessage('Empty function name', 1, 0));
        }
        new SpaceParser(this.reader).parse();
        const prefix = this.reader.read(1);
        if (prefix !== '(') {
            throw new Error(this.reader.makeErrorMessage(`Wrong string "${prefix}"`, 1, 0 - 1));
        }
        new SpaceParser(this.reader).parse();
        const params: ParamExpression[] = [];
        while (this.parsers.param.test()) {
            const param = this.parsers.param.parse();
            params.push(param);
            new SpaceParser(this.reader).parse();
        }
        const suffix = this.reader.read(1);
        if (suffix !== ')') {
            throw new Error(this.reader.makeErrorMessage(`Wrong string "${suffix}"`, 1, 0 - 1));
        }

        return {
            type: 'method',
            function: name,
            params,
        };
    }
}

export class ConditionParser extends Parser<ConditionExpression> {
    private parsers?: { arg: Parser<ArgExpression>, array: Parser<ArgExpression[]> };

    init(arg: Parser<ArgExpression>, array: Parser<ArgExpression[]>): void {
        this.parsers = {
            arg,
            array,
        };
    }

    parse(): ConditionExpression {
        if (!this.parsers) {
            throw new Error('Must be inited');
        }
        new SpaceParser(this.reader).parse();
        if (this.reader.test(1) === '(') {
            this.reader.read(1);
            new SpaceParser(this.reader).parse();
            const condition = this.parse();
            new SpaceParser(this.reader).parse();
            const suffix = this.reader.read(1);
            if (suffix !== ')') {
                throw new Error(this.reader.makeErrorMessage(`Wrong string "${suffix}"`, 1, 0 - 1));
            }
            return {
                type: 'condition',
                condition: {
                    type: 'brackets',
                    condition,
                },
            };
        }

        if (!this.parsers.arg.test()) {
            throw new Error(this.reader.makeErrorMessage('Invalid condition', 1, 0));
        }
        let conditionLeft: ConditionExpression;
        const arg = this.parsers.arg.parse();
        new SpaceParser(this.reader).parse();
        let not = false;
        if (this.reader.test(3) === 'not') {
            not = true;
            this.reader.read(3);
            new SpaceParser(this.reader).parse();
        }
        if (this.reader.test(2) === 'eq') {
            this.reader.read(2);
            new SpaceParser(this.reader).parse();
            const argRight = this.parsers.arg.parse();

            conditionLeft = {
                type: 'condition',
                condition: {
                    type: 'eq',
                    not,
                    argLeft: arg,
                    argRight,
                },
            };
        } else if (this.reader.test(4) === 'like') {
            this.reader.read(4);
            new SpaceParser(this.reader).parse();
            const argRight = this.parsers.arg.parse();

            conditionLeft = {
                type: 'condition',
                condition: {
                    type: 'like',
                    not,
                    argLeft: arg,
                    argRight,
                },
            };
        } else if (this.reader.test(2) === 'in') {
            this.reader.read(2);
            new SpaceParser(this.reader).parse();
            const array = this.parsers.array.parse();

            conditionLeft = {
                type: 'condition',
                condition: {
                    type: 'in',
                    not,
                    arg,
                    array,
                },
            };
        } else {
            conditionLeft = {
                type: 'condition',
                condition: {
                    type: 'arg',
                    arg,
                },
            };
        }

        new SpaceParser(this.reader).parse();
        if (this.reader.test(2) === 'or') {
            this.reader.read(2);
            new SpaceParser(this.reader).parse();
            const conditionRight = this.parse();

            return {
                type: 'condition',
                condition: {
                    type: 'or',
                    conditionLeft,
                    conditionRight,
                },
            };
        }
        if (this.reader.test(3) === 'and') {
            this.reader.read(3);
            new SpaceParser(this.reader).parse();
            const conditionRight = this.parse();

            return {
                type: 'condition',
                condition: {
                    type: 'and',
                    conditionLeft,
                    conditionRight,
                },
            };
        }

        return conditionLeft;
    }
}

export class BlocksParser extends Parser<BlockExpression[]> {
    private parsers?: {
        if: Parser<IfExpression>,
        for: Parser<ForExpression>,
        set: Parser<SetExpression>,
        trim: Parser<TrimExpression>,
        nl: Parser<NlExpression>,
        print: Parser<PrintExpression>,
        conf: Parser<ConfExpression>,
    };

    init(
        ifParser: Parser<IfExpression>,
        forParser: Parser<ForExpression>,
        set: Parser<SetExpression>,
        trim: Parser<TrimExpression>,
        nl: Parser<NlExpression>,
        print: Parser<PrintExpression>,
        conf: Parser<ConfExpression>,
    ): void {
        this.parsers = {
            if: ifParser,
            for: forParser,
            set,
            trim,
            nl,
            print,
            conf,
        };
    }

    parse(): BlockExpression[] {
        if (!this.parsers) {
            throw new Error('Must be inited');
        }
        const blocks: BlockExpression[] = [];
        while (this.reader.left) {
            let prefix = '';
            if (this.reader.test(1) === '\\') {
                this.reader.read(1);
                prefix = this.reader.read(2);
            }
            const text = prefix + new StringParser(this.reader, /[{\\]/).parse();
            if (text) {
                blocks.push(text);
            } else if (this.parsers.if.test()) {
                const ifExpression = this.parsers.if.parse();
                blocks.push(ifExpression);
            } else if (this.parsers.for.test()) {
                const forExpression = this.parsers.for.parse();
                blocks.push(forExpression);
            } else if (this.parsers.set.test()) {
                const setExpression = this.parsers.set.parse();
                blocks.push(setExpression);
            } else if (this.parsers.trim.test()) {
                const trimExpression = this.parsers.trim.parse();
                blocks.push(trimExpression);
            } else if (this.parsers.nl.test()) {
                const nlExpression = this.parsers.nl.parse();
                blocks.push(nlExpression);
            } else if (this.parsers.print.test()) {
                const printExpression = this.parsers.print.parse();
                blocks.push(printExpression);
            } else if (this.parsers.conf.test()) {
                const confExpression = this.parsers.conf.parse();
                blocks.push(confExpression);
            } else if (new UnknownEndDirectiveParser(this.reader).test()) {
                break;
            } else {
                if (new UnknownStartDirectiveParser(this.reader).test()) {
                    const directive = new UnknownStartDirectiveParser(this.reader).parse();
                    throw new Error(this.reader.makeErrorMessage(`Unknown start directive "${directive}"`, directive.length, 0 - 1 - directive.length));
                }
                throw new Error(this.reader.makeErrorMessage(`Unknown "${this.reader.test(10)}"`, 10, 0));
            }
        }
        return blocks;
    }
}

export class IfParser extends Parser<IfExpression> {
    private parsers?: { condition: Parser<ConditionExpression>, blocks: Parser<BlockExpression[]> };

    init(condition: Parser<ConditionExpression>, blocks: Parser<BlockExpression[]>): void {
        this.parsers = {
            condition,
            blocks,
        };
    }

    test(): boolean {
        return new StartOpenDirectiveParser(this.reader, 'if').test();
    }

    parse(): IfExpression {
        if (!this.parsers) {
            throw new Error('Must be inited');
        }
        new StartOpenDirectiveParser(this.reader, 'if').parse();
        new SpaceParser(this.reader).parse();
        const condition = this.parsers.condition.parse();
        new SpaceParser(this.reader).parse();
        new StartCloseDirectiveParser(this.reader).parse();
        const blocks = this.parsers.blocks.parse();
        new EndDirectiveParser(this.reader, 'if').parse();

        return {
            type: 'if',
            condition,
            blocks,
        };
    }
}

export class ForParser extends Parser<ForExpression> {
    private parsers?: { arg: Parser<ArgExpression>, array: Parser<ArgExpression[]>, blocks: Parser<BlockExpression[]> };

    init(arg: Parser<ArgExpression>, array: Parser<ArgExpression[]>, blocks: Parser<BlockExpression[]>): void {
        this.parsers = {
            arg,
            array,
            blocks,
        };
    }

    test(): boolean {
        return new StartOpenDirectiveParser(this.reader, 'for').test();
    }

    parseSubtype(): ForExpression['subtype'] {
        if (!this.parsers) {
            throw new Error('Must be inited');
        }
        const subtype = this.reader.read(2);
        if (subtype !== 'in' && subtype !== 'of') {
            throw new Error(this.reader.makeErrorMessage(`Wrong string "${subtype}"`, 2, 0 - 2));
        }
        new SpaceParser(this.reader).parse();
        if (subtype === 'in') {
            const from = this.parsers.arg.parse();
            const part = this.reader.read(2);
            if (part !== '..') {
                throw new Error(this.reader.makeErrorMessage(`Wrong string "${part}"`, 2, 0 - 2));
            }
            const to = this.parsers.arg.parse();
            return {
                type: 'in',
                from,
                to,
            };
        }
        const array = this.parsers.array.parse();
        return {
            type: 'of',
            array,
        };
    }

    parse(): ForExpression {
        if (!this.parsers) {
            throw new Error('Must be inited');
        }
        new StartOpenDirectiveParser(this.reader, 'for').parse();
        new SpaceParser(this.reader).parse();
        const identificator = new IdentificatorParser(this.reader).parse();
        new SpaceParser(this.reader).parse();
        const subtype = this.parseSubtype();
        new SpaceParser(this.reader).parse();
        new StartCloseDirectiveParser(this.reader).parse();
        const blocks = this.parsers.blocks.parse();
        new EndDirectiveParser(this.reader, 'for').parse();

        return {
            type: 'for',
            identificator,
            subtype,
            blocks,
        };
    }
}

export class SetParser extends Parser<SetExpression> {
    private parsers?: { arg: Parser<ArgExpression> };

    init(arg: Parser<ArgExpression>): void {
        this.parsers = {
            arg,
        };
    }

    test(): boolean {
        return new StartOpenDirectiveParser(this.reader, 'set').test();
    }

    parse(): SetExpression {
        if (!this.parsers) {
            throw new Error('Must be inited');
        }
        new StartOpenDirectiveParser(this.reader, 'set').parse();
        new SpaceParser(this.reader).parse();
        const identificator = new IdentificatorParser(this.reader).parse();
        new SpaceParser(this.reader).parse();
        const part = this.reader.read(1);
        if (part !== '=') {
            throw new Error(this.reader.makeErrorMessage(`Wrong string "${part}"`, 1, 0 - 1));
        }
        new SpaceParser(this.reader).parse();
        const arg = this.parsers.arg.parse();
        new SpaceParser(this.reader).parse();
        new StartCloseDirectiveParser(this.reader).parse();

        return {
            type: 'set',
            identificator,
            arg,
        };
    }
}

export class ConfParser extends Parser<ConfExpression> {
    private parsers?: { arg: Parser<ArgExpression> };

    init(arg: Parser<ArgExpression>): void {
        this.parsers = {
            arg,
        };
    }

    test(): boolean {
        return new StartOpenDirectiveParser(this.reader, 'conf').test();
    }

    parse(): ConfExpression {
        if (!this.parsers) {
            throw new Error('Must be inited');
        }
        new StartOpenDirectiveParser(this.reader, 'conf').parse();
        new SpaceParser(this.reader).parse();
        const identificator = new IdentificatorParser(this.reader).parse();
        new SpaceParser(this.reader).parse();
        const part = this.reader.read(1);
        if (part !== '=') {
            throw new Error(this.reader.makeErrorMessage(`Wrong string "${part}"`, 1, 0 - 1));
        }
        new SpaceParser(this.reader).parse();
        const arg = this.parsers.arg.parse();
        new SpaceParser(this.reader).parse();
        new StartCloseDirectiveParser(this.reader).parse();

        return {
            type: 'conf',
            identificator,
            arg,
        };
    }
}

export class PrintParser extends Parser<PrintExpression> {
    private parsers?: { arg: Parser<ArgExpression> };

    init(arg: Parser<ArgExpression>): void {
        this.parsers = {
            arg,
        };
    }

    test(): boolean {
        return new StartOpenDirectiveParser(this.reader, ':').test();
    }

    parse(): PrintExpression {
        if (!this.parsers) {
            throw new Error('Must be inited');
        }
        new StartOpenDirectiveParser(this.reader, ':').parse();
        new SpaceParser(this.reader).parse();
        const arg = this.parsers.arg.parse();
        new SpaceParser(this.reader).parse();
        new StartCloseDirectiveParser(this.reader).parse();

        return {
            type: 'print',
            arg,
        };
    }
}

export class TrimParser extends Parser<TrimExpression> {
    private parsers?: Record<string, unknown>;

    init(): void {
        this.parsers = {};
    }

    test(): boolean {
        return new StartOpenDirectiveParser(this.reader, 'trim').test();
    }

    parse(): TrimExpression {
        if (!this.parsers) {
            throw new Error('Must be inited');
        }
        new StartOpenDirectiveParser(this.reader, 'trim').parse();
        new SpaceParser(this.reader).parse();
        const direction = this.reader.test(1) === '}' ? 'both' : new IdentificatorParser(this.reader).parse();
        if (direction !== 'left' && direction !== 'right' && direction !== 'both') {
            throw new Error(this.reader.makeErrorMessage(`Wrong string "${direction}"`, direction.length, 0 - direction.length));
        }
        new SpaceParser(this.reader).parse();
        new StartCloseDirectiveParser(this.reader).parse();

        return {
            type: 'trim',
            direction,
        };
    }
}

export class NlParser extends Parser<NlExpression> {
    private parsers?: Record<string, unknown>;

    init(): void {
        this.parsers = {};
    }

    test(): boolean {
        return new StartOpenDirectiveParser(this.reader, 'nl').test();
    }

    parse(): NlExpression {
        if (!this.parsers) {
            throw new Error('Must be inited');
        }
        new StartOpenDirectiveParser(this.reader, 'nl').parse();
        new SpaceParser(this.reader).parse();
        new StartCloseDirectiveParser(this.reader).parse();

        return {
            type: 'nl',
        };
    }
}
