import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AccountsPayable = () => {
  const [accounts, setAccounts] = useState([
    { id: 1, description: "Fornecedor - Queijo Minas", dueDate: "2025-01-25", value: "2.450.00", status: "Pendente" },
    { id: 2, description: "Energia Elétrica", dueDate: "2025-01-28", value: "580.00", status: "Pendente" },
    { id: 3, description: "Aluguel do Galpão", dueDate: "2025-01-30", value: "1.800.00", status: "Pendente" },
    { id: 4, description: "Fornecedor - Embalagens", dueDate: "2025-01-18", value: "600.00", status: "Pago" },
  ]);

  const [formData, setFormData] = useState({
    description: "",
    value: "",
    dueDate: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Conta cadastrada!",
      description: "A conta a pagar foi adicionada com sucesso.",
    });
    setFormData({ description: "", value: "", dueDate: "" });
  };

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
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Conta a Pagar</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Fornecedor - Matéria Prima"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value">Valor (R$)</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Vencimento</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                Cadastrar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
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
