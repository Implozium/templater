import Reader from '../Reader';

abstract class Parser<T> {
    protected reader: Reader;

    constructor(reader: Reader) {
        this.reader = reader;
    }

    /**
     * Test conditions for this parser
     */
    test(): boolean {
        return true;
    }

    /**
     * Read symbols from the reader while the condition function returns true
     */
    readWhile(condition: (buffer: string) => boolean): string {
        let buffer = '';
        if (!this.reader.left) {
            return buffer;
        }
        while (this.reader.left && condition(buffer)) {
            buffer += this.reader.read();
        }
        return buffer;
    }

    /**
     * Parse strings from the reader and return a parsed data
     */
    abstract parse(): T;
}

export default Parser;
