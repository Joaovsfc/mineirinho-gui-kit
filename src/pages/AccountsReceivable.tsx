import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AccountsReceivable = () => {
  const [accounts, setAccounts] = useState([
    { id: 1, client: "Padaria Central", dueDate: "2025-01-25", value: "1.250.00", status: "Pendente" },
    { id: 2, client: "Mercado Silva", dueDate: "2025-01-22", value: "890.00", status: "Pendente" },
    { id: 3, client: "Lanchonete Boa Vista", dueDate: "2025-01-30", value: "650.00", status: "Pendente" },
    { id: 4, client: "Padaria Central", dueDate: "2025-01-15", value: "1.100.00", status: "Recebido" },
  ]);

  const handleReceive = (id: number) => {
    setAccounts(accounts.map(acc => 
      acc.id === id ? { ...acc, status: "Recebido" } : acc
    ));
    toast({
      title: "Recebimento registrado!",
      description: "A conta foi marcada como recebida.",
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === "Recebido") {
      return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Recebido</Badge>;
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
          <h1 className="text-3xl font-bold text-foreground">Contas a Receber</h1>
          <p className="text-muted-foreground">Acompanhe seus recebimentos</p>
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
              Total a Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
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
              Recebidas este Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {accounts.filter(a => a.status === "Recebido").length}
            </div>
            <p className="text-xs text-muted-foreground">Contas recebidas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Contas a Receber</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.client}</TableCell>
                  <TableCell>{new Date(account.dueDate).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>R$ {account.value}</TableCell>
                  <TableCell>{getStatusBadge(account.status)}</TableCell>
                  <TableCell className="text-right">
                    {account.status === "Pendente" && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleReceive(account.id)}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Confirmar Recebimento
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

export default AccountsReceivable;
