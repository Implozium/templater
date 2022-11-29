class Reader {
    private position = 0;

    private content: string;

    private row = 1;

    private column = 1;

    constructor(content: string) {
        this.content = content;
    }

    get length(): number {
        return this.content.length;
    }

    get left(): number {
        return this.content.length - this.position;
    }

    getPosition(): [number, number] {
        return [this.row, this.column];
    }

    test(length = 1): string {
        return this.content.slice(this.position, this.position + length);
    }

    read(length = 1): string {
        if (this.position + length > this.content.length) {
            throw new Error(`Out of bounds: ${this.position} ${length} > ${this.content.length}`);
        }
        const slice = this.content.slice(this.position, this.position + length);
        this.position += length;
        for (let i = 0; i < slice.length; i++) {
            this.column += 1;
            if (slice[i] === '\n') {
                this.row += 1;
                this.column = 1;
            }
        }
        return slice;
    }

    makeErrorMessage(message: string, lenght: number, offset = 0): string {
        let { row, column } = this;
        const sign = offset < 0 ? -1 : 1;
        for (let i = 0; i < offset * sign; i++) {
            column += sign;
            if (this.content[this.position + sign * (i + 1)] === '\n') {
                row += sign;
                column = 1;
            }
        }
        const start = this.content.lastIndexOf('\n', this.position + offset);
        const end = this.content.indexOf('\n', this.position + offset);
        const line = this.content.slice(start < 0 ? 0 : start, end < 0 ? this.content.length : end);
        const shift = this.position + offset - (start < 0 ? 0 : start + 1);
        return `${message} at postion ${row}:${column}:\n\n${line}\n${' '.repeat(shift)}${'^'.repeat(lenght)} - ${message}`;
    }
}

export default Reader;
