Symbols:
```
<TEXT> = "\"" <LETTERS> "\""
      | "'" <LETTERS> "'".
<IDENTIFICATOR> = <LETTERS>.
<ARG> = (<VARIABLE> | <TEXT>) {"->" <METHOD>}.
<ARG_LIST> = <ARG> {"," <ARG>}.
<PARAM> = <TEXT> {"=" <ARG>}.
<PARAMS_LIST> = <PARAM> {"," <PARAM>}.
<FUNCTION> = <LETTERS>.
<METHOD> = <FUNCTION> "(" [<PARAMS_LIST>] ")".
<VARIABLE> = <IDENTIFICATOR> {("." <IDENTIFICATOR> | "[" <ARG> "]")}.
<ARRAY> = "[" [<ARG_LIST>] "]".
<CONDITION> = <ARG>
            | <ARG> ["not"] ( "eq" | "like" ) <ARG>
            | <ARG> ["not"] "in" <ARRAY>
            | <CONDITION> ( "and" | "or" ) <CONDITION>
            | "(" <CONDITION> ")".

<PRINT> = "{{:" <ARG> "}}".
<CONF> = "{{conf" <IDENTIFICATOR> "=" <ARG> "}}".
<IF> = "{{if" <CONDITION> "}}" <BLOCK> "{{/if}}".
<SET> = "{{set" <IDENTIFICATOR> "=" <ARG> "}}".
<TRIM> = "{{trim}}".
<NL> = "{{nl}}".
<FOR> = "{{for" <IDENTIFICATOR> "of" <ARRAY> "}}" <BLOCK> "{{/for}}"
      | "{{for" <IDENTIFICATOR> "in" <ARG> ".." <ARG> "}}" <BLOCK> "{{/for}}".
<BLOCK> = <LETTERS>
      | <IF>
      | <FOR>
      | <PRINT>
      | <CONF>
      | <SET>
      | <TRIM>
      | <NL>.
```
