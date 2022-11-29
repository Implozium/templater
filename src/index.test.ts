import Templater from './index';

describe('Templater.render', () => {
    describe('#variable', () => {
        it('should render text', () => {
            const output = Templater.render(
                'This is text',
            );
            expect(output)
                .toEqual('This is text');
        });
        it('should trim spaces and render text', () => {
            const output = Templater.render(
                '  This   is  text  ',
            );
            expect(output)
                .toEqual('This is text');
        });

        it('should remove new line and render text', () => {
            const output = Templater.render(
                '  This \n  is  \ntext\n  ',
            );
            expect(output)
                .toEqual('This is text');
        });

        it('should render with text in double quotes', () => {
            const output = Templater.render(
                '{{:"text"}}',
            );
            expect(output)
                .toEqual('text');
        });

        it('should render with text in single quotes', () => {
            const output = Templater.render(
                '{{:\'text\'}}',
            );
            expect(output)
                .toEqual('text');
        });

        it('should render with text in double quotes with escaped quote', () => {
            const output = Templater.render(
                '{{:"te\\"x\\"t"}}',
            );
            expect(output)
                .toEqual('te"x"t');
        });

        it('should render with variable', () => {
            const output = Templater.render(
                '{{:a}}',
                { a: 'text' },
            );
            expect(output)
                .toEqual('text');
        });

        it('should not render without variable', () => {
            const output = Templater.render(
                '{{:a}}',
            );
            expect(output)
                .toEqual('');
        });

        it('should render text with escaped symbol', () => {
            const output = Templater.render(
                '\\{{:a}}',
            );
            expect(output)
                .toEqual('{{:a}}');
        });

        it('should render variables with around text', () => {
            const output = Templater.render(
                'This task "{{:task}}-{{:id}}"',
                { task: 'TASK', id: '12' },
            );
            expect(output)
                .toEqual('This task "TASK-12"');
        });

        it('should apply method to variable', () => {
            const output = Templater.render(
                '{{:a -> length()}}',
                { a: 'text' },
                { length: (value) => typeof value === 'string' ? String(value.length) : String(Object.keys(value).length) },
            );
            expect(output)
                .toEqual('4');
        });

        it('should apply method to variable with params', () => {
            const output = Templater.render(
                '{{:a -> replace(from="x" to="s")}}',
                { a: 'text' },
                { replace: (value, {from, to}) => String(value).replace(from, to) },
            );
            expect(output)
                .toEqual('test');
        });

        it('should apply methods to variable', () => {
            const output = Templater.render(
                '{{:a -> replace(from="x" to="") -> length()}}',
                { a: 'text' },
                {
                    length: (value) => typeof value === 'string' ? String(value.length) : String(Object.keys(value).length),
                    replace: (value, {from, to}) => String(value).replace(from, to),
                },
            );
            expect(output)
                .toEqual('3');
        });

        it('should apply methods to text', () => {
            const output = Templater.render(
                '{{:"text" -> replace(from="x" to="") -> length()}}',
                { },
                {
                    length: (value) => typeof value === 'string' ? String(value.length) : String(Object.keys(value).length),
                    replace: (value, {from, to}) => String(value).replace(from, to),
                },
            );
            expect(output)
                .toEqual('3');
        });
    });

    describe('#directive if', () => {
        it('should render block if condition is true', () => {
            const output = Templater.render(
                'This is {{if mod eq "bold"}}**{{/if}}text{{if mod eq "bold"}}**{{/if}}',
                { mod: 'bold' },
            );
            expect(output)
                .toEqual('This is **text**');
        });

        it('should not render block if condition is false', () => {
            const output = Templater.render(
                'This is {{if mod eq "bold"}}**{{/if}}text{{if mod eq "bold"}}**{{/if}}',
                { mod: '' },
            );
            expect(output)
                .toEqual('This is text');
        });
    });

    describe('#directive for', () => {
        it('should render block 3 times', () => {
            const output = Templater.render(
                'This is counter:{{for index in "1".."4"}} {{:index}} and{{/for}} 4...',
                { },
            );
            expect(output)
                .toEqual('This is counter: 1 and 2 and 3 and 4...');
        });
    });

    describe('#directive set', () => {
        it('should set variable and render it', () => {
            const output = Templater.render(
                'This counter is {{set index = counter}}{{:index}}',
                { counter: '3' },
            );
            expect(output)
                .toEqual('This counter is 3');
        });
    });

    describe('#directive conf', () => {
        it('should apply conf and render it', () => {
            const output = Templater.render(
                'This  row  with  single  spaces  and {{conf squash = "off"}}  without   them  {{conf squash = "on"}} but  return  it',
                { counter: '3' },
            );
            expect(output)
                .toEqual('This row with single spaces and   without   them   but return it');
        });
    });

    describe('#directive trim', () => {
        it('should trim spaces and render it', () => {
            const output = Templater.render(
                'This counter - {{trim}} {{:counter}} {{trim}} .',
                { counter: '3' },
            );
            expect(output)
                .toEqual('This counter -3.');
        });
    });

    describe('#directive nl', () => {
        it('should add new line and render it', () => {
            const output = Templater.render(
                'This counter: {{nl}}- {{:counter}}.',
                { counter: '3' },
            );
            expect(output)
                .toEqual('This counter:\n- 3.');
        });
    });

    describe('#common tests', () => {
        it('should render complex block', () => {
            const output = Templater.render(`
                You have {{:weapons -> length()}} weapons:
                {{for id in "0"..weapons -> length()}}
                    {{set weapon = weapons[id]}}
                    {{nl}}- "{{:weapon.name}}" with damage
                        from "{{:weapon.damage.from}}" to "{{:weapon.damage.to}}"
                        {{if weapon.modificators -> length() not eq "0"}}
                            ({{trim}}
                            {{for mod in "0"..weapon.modificators -> length()}}
                                {{:weapon.modificators[mod]}}{{:mod -> match(length=weapon.modificators -> length() middle="," last="")}}
                            {{/for}}
                            {{trim}})
                        {{/if}}
                    {{trim}}{{:id -> match(length=weapons -> length() middle=";" last=".")}}
                {{/for}}
                {{nl}}
                {{nl}}What should you take?
                `, {
                    weapons: [
                        {
                            name: 'Bow',
                            damage: {
                                from: '1',
                                to: '6',
                            },
                            type: 'project',
                        },
                        {
                            name: 'Knife',
                            damage: {
                                from: '2',
                                to: '4',
                            },
                            type: 'cut',
                            modificators: ['fire', 'ice'],
                        },
                    ],
                },
                {
                    length: (value) => !value || typeof value === 'string'
                        ? '0'
                        : String(Object.keys(value).length),
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
                },
            );
            expect(output)
                .toEqual(
`You have 2 weapons:
- "Bow" with damage from "1" to "6";
- "Knife" with damage from "2" to "4" (fire, ice).

What should you take?`);
        });
    });
});

describe('Templater.check', () => {
    it('should be true if variable exists', () => {
        const result = Templater.check(
            '  a  ',
            { a: '1' },
        );
        expect(result)
            .toEqual(true);
    });

    it('should be false if variable does not exist', () => {
        const result = Templater.check(
            'a',
        );
        expect(result)
            .toEqual(false);
    });

    it('should be true if variable equals value', () => {
        const result = Templater.check(
            'a eq "1"',
            { a: '1' },
        );
        expect(result)
            .toEqual(true);
    });

    it('should be true if variable does not equal value', () => {
        const result = Templater.check(
            'a not eq "2"',
            { a: '1' },
        );
        expect(result)
            .toEqual(true);
    });

    it('should be true if variable equals another variable', () => {
        const result = Templater.check(
            'a eq b',
            { a: '1', b: '1' },
        );
        expect(result)
            .toEqual(true);
    });

    it('should be true if one of variables exists', () => {
        const result = Templater.check(
            'a or b',
            { b: '1' },
        );
        expect(result)
            .toEqual(true);
    });

    it('should be false if none of variables does not exist', () => {
        const result = Templater.check(
            'a or b',
            { },
        );
        expect(result)
            .toEqual(false);
    });

    it('should be true if two variables exist', () => {
        const result = Templater.check(
            'a and b',
            { a: '1', b: '1' },
        );
        expect(result)
            .toEqual(true);
    });

    it('should be false if one of variables does not exist', () => {
        const result = Templater.check(
            'a and b',
            { a: '1' },
        );
        expect(result)
            .toEqual(false);
    });

    it('should be true if one of groups is true', () => {
        const result = Templater.check(
            '(a eq "1") or (b not eq "1")',
            { a: '1', b: '1' },
        );
        expect(result)
            .toEqual(true);
    });

    it('should be true if groups are true', () => {
        const result = Templater.check(
            '(a eq "1") and (b not eq "2")',
            { a: '1', b: '1' },
        );
        expect(result)
            .toEqual(true);
    });
});
