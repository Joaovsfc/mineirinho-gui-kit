import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AccountsPayable = () => {
  const [accounts, setAccounts] = useState([
    { id: 1, description: "Fornecedor - Queijo Minas", dueDate: "2025-01-25", value: "2.450.00", status: "Pendente" },
    { id: 2, description: "Energia Elétrica", dueDate: "2025-01-28", value: "580.00", status: "Pendente" },
    { id: 3, description: "Aluguel do Galpão", dueDate: "2025-01-30", value: "1.800.00", status: "Pendente" },
    { id: 4, description: "Fornecedor - Embalagens", dueDate: "2025-01-18", value: "600.00", status: "Pago" },
  ]);

  const handlePayment = (id: number) => {
    setAccounts(accounts.map(acc => 
      acc.id === id ? { ...acc, status: "Pago" } : acc
    ));
    toast({
      title: "Pagamento registrado!",
      description: "A conta foi marcada como paga.",
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === "Pago") {
      return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Pago</Badge>;
    }
    return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Pendente</Badge>;
  };

  const totalPending = accounts
    .filter(acc => acc.status === "Pendente")
    .reduce((sum, acc) => sum + parseFloat(acc.value), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contas a Pagar</h1>
          <p className="text-muted-foreground">Gerencie seus compromissos financeiros</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Conta
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              R$ {totalPending.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {accounts.filter(a => a.status === "Pendente").length} contas em aberto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vencendo Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Nenhuma conta vencendo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pagas este Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {accounts.filter(a => a.status === "Pago").length}
            </div>
            <p className="text-xs text-muted-foreground">Contas quitadas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Contas a Pagar</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.description}</TableCell>
                  <TableCell>{new Date(account.dueDate).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>R$ {account.value}</TableCell>
                  <TableCell>{getStatusBadge(account.status)}</TableCell>
                  <TableCell className="text-right">
                    {account.status === "Pendente" && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handlePayment(account.id)}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Marcar como Pago
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountsPayable;
