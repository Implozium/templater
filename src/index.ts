import Executor, { Methods, Variables } from './Executor';
import Reader from './Reader';
import {
    ArgParser,
    ArrayParser,
    VariableParser,
    MethodParser,
    ConditionParser,
    BlocksParser,
    IfParser,
    ForParser,
    SetParser,
    TrimParser,
    ParamParser,
    NlParser,
    PrintParser,
    ConfParser,
} from './parsers';

export interface TemplaterRenderOptions {
    trimEndLine?: boolean;
}

const commonMethods: Methods = {
    length: (value) => typeof value === 'string' ? String(value.length) : String(Object.keys(value).length),
    replace: (value, { from, to }) => String(value).replace(from, to),
    match: (value, { length, first, middle, last }) => {
        const strValue = String(value);
        const end = String(Number(length) - 1);
        if (last === undefined) {
            if (strValue === '0' && strValue !== end) {
                return first;
            }
            return middle;
        }
        if (first === undefined) {
            if (strValue !== '0' && strValue === end) {
                return last;
            }
            return middle;
        }
        if (strValue === '0') {
            return first;
        }
        if (strValue === end) {
            return last;
        }
        return middle;
    },
    case: (value, props) => {
        if (value === props.on) {
            return props.then;
        }
        if (props.else !== undefined) {
            return props.else;
        }
        return value;
    },
};

class Templater {
    private methods: Methods;

    constructor(methods: Methods = {}) {
        this.methods = {
            ...commonMethods,
            ...methods,
        };
    }

    render(text: string, variables: Variables = {}, options: TemplaterRenderOptions = {}): string {
        const assignedOptions: Required<TemplaterRenderOptions> = {
            trimEndLine: true,
            ...options,
        };
        const reader = new Reader(text);
        const argParser = new ArgParser(reader);
        const arrayParser = new ArrayParser(reader);
        const variableParser = new VariableParser(reader);
        const methodParser = new MethodParser(reader);
        const conditionParser = new ConditionParser(reader);
        const blocksParser = new BlocksParser(reader);
        const ifParser = new IfParser(reader);
        const forParser = new ForParser(reader);
        const setParser = new SetParser(reader);
        const trimParser = new TrimParser(reader);
        const nlParser = new NlParser(reader);
        const printParser = new PrintParser(reader);
        const confParser = new ConfParser(reader);
        const paramParser = new ParamParser(reader);

        argParser.init(variableParser, methodParser);
        arrayParser.init(argParser);
        variableParser.init(argParser);
        paramParser.init(argParser);
        methodParser.init(paramParser);
        conditionParser.init(argParser, arrayParser);
        blocksParser.init(ifParser, forParser, setParser, trimParser, nlParser, printParser, confParser);
        ifParser.init(conditionParser, blocksParser);
        forParser.init(argParser, arrayParser, blocksParser);
        setParser.init(argParser);
        trimParser.init();
        nlParser.init();
        printParser.init(argParser);
        confParser.init(argParser);
        paramParser.init(argParser);
        
        const expression = blocksParser.parse();

        let output = new Executor(variables, this.methods).render(expression);
        if (assignedOptions.trimEndLine) {
            output = output.replace(/ +\n/g, '\n');
        }
        return output;
    }

    check(text: string, variables: Variables = {}): boolean {
        const reader = new Reader(text);
        const argParser = new ArgParser(reader);
        const arrayParser = new ArrayParser(reader);
        const variableParser = new VariableParser(reader);
        const methodParser = new MethodParser(reader);
        const conditionParser = new ConditionParser(reader);
        const paramParser = new ParamParser(reader);
    
        argParser.init(variableParser, methodParser);
        arrayParser.init(argParser);
        variableParser.init(argParser);
        paramParser.init(argParser);
        methodParser.init(paramParser);
        conditionParser.init(argParser, arrayParser);

        const expression = conditionParser.parse();

        return new Executor(variables, this.methods).check(expression);
    }

    static render(
        text: string,
        variables: Variables = {},
        methods: Methods = {},
        options: TemplaterRenderOptions = {},
    ): string {
        return new Templater(methods).render(text, variables, options);
    }

    static check(text: string, variables: Variables = {}, methods: Methods = {}): boolean {
        return new Templater(methods).check(text, variables);
    }
}

export default Templater;
