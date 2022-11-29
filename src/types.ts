export interface TextExpression {
    type: 'text';
    text: string;
}

export interface VariableExpression {
    type: 'variable';
    root: string;
    parts: (string | ArgExpression)[];
}

export interface ArgExpression {
    type: 'arg';
    value:
        | {
            type: 'text';
            text: string;
        }
        | {
            type: 'variable';
            variable: VariableExpression;
        };
    methods: MethodExpression[];
}

export interface ParamExpression {
    type: 'param';
    key: string;
    value?: ArgExpression;
}

export interface MethodExpression {
    type: 'method';
    function: string;
    params: ParamExpression[];
}

export interface ConditionExpression {
    type: 'condition';
    condition:
        | {
            type: 'brackets';
            condition: ConditionExpression;
        }
        | {
            type: 'and' | 'or';
            conditionLeft: ConditionExpression;
            conditionRight: ConditionExpression;
        }
        | {
            type: 'eq' | 'like';
            not: boolean;
            argLeft: ArgExpression;
            argRight: ArgExpression;
        }
        | {
            type: 'in';
            not: boolean;
            arg: ArgExpression;
            array: ArgExpression[];
        }
        | {
            type: 'arg';
            arg: ArgExpression;
        };
}

export interface IfExpression {
    type: 'if';
    condition: ConditionExpression;
    blocks: BlockExpression[];
}

export interface PrintExpression {
    type: 'print';
    arg: ArgExpression;
}

export interface ForExpression {
    type: 'for';
    identificator: string;
    subtype:
        | {
            type: 'in';
            from: ArgExpression;
            to: ArgExpression;
        }
        | {
            type: 'of';
            array: ArgExpression[];
        };
    blocks: BlockExpression[];
}

export interface SetExpression {
    type: 'set';
    identificator: string;
    arg: ArgExpression;
}

export interface ConfExpression {
    type: 'conf';
    identificator: string;
    arg: ArgExpression;
}

export interface TrimExpression {
    type: 'trim';
    direction: 'right' | 'left' | 'both';
}

export interface NlExpression {
    type: 'nl';
}

export type BlockExpression =
    | IfExpression
    | ForExpression
    | SetExpression
    | TrimExpression
    | NlExpression
    | PrintExpression
    | ConfExpression
    | string;
