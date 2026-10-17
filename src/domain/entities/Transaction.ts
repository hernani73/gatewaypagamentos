export interface TransactionProps {
  id: string;
  accountId: string;
  amount: number;
  type: 'DEBIT' | 'CREDIT';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
}

export class Transaction {
  private props: TransactionProps;

  constructor(props: Omit<TransactionProps, 'id' | 'status' | 'createdAt'>, id?: string) {
    this.props = {
      ...props,
      id: id ?? Math.random().toString(36).substring(2, 11).toUpperCase(),
      status: 'PENDING',
      createdAt: new Date()
    };
  }

  public static create(props: Omit<TransactionProps, 'id' | 'status' | 'createdAt'>): Transaction {
    if (props.amount <= 0) {
      throw new Error("Transaction amount must be greater than zero.");
    }
    return new Transaction(props);
  }

  public approve(): void {
    this.props.status = 'APPROVED';
  }

  public reject(): void {
    this.props.status = 'REJECTED';
  }

  public getId(): string { return this.props.id; }
  public getAccountId(): string { return this.props.accountId; }
  public getAmount(): number { return this.props.amount; }
  public getType(): 'DEBIT' | 'CREDIT' { return this.props.type; }
  public getStatus(): 'PENDING' | 'APPROVED' | 'REJECTED' { return this.props.status; }

  public toJSON() {
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
