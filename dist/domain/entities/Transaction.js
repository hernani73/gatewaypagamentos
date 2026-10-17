"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transaction = void 0;
class Transaction {
    props;
    constructor(props, id) {
        this.props = {
            ...props,
            id: id ?? Math.random().toString(36).substring(2, 11).toUpperCase(),
            status: 'PENDING',
            createdAt: new Date()
        };
    }
    static create(props) {
        if (props.amount <= 0) {
            throw new Error("Transaction amount must be greater than zero.");
        }
        return new Transaction(props);
    }
    approve() {
        this.props.status = 'APPROVED';
    }
    reject() {
        this.props.status = 'REJECTED';
    }
    getId() { return this.props.id; }
    getAccountId() { return this.props.accountId; }
    getAmount() { return this.props.amount; }
    getType() { return this.props.type; }
    getStatus() { return this.props.status; }
    toJSON() {
        return {
            id: this.props.id,
            accountId: this.props.accountId,
            amount: this.props.amount,
            type: this.props.type,
            status: this.props.status,
            createdAt: this.props.createdAt
        };
    }
}
exports.Transaction = Transaction;
