import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Consignment = () => {
  const [consignments] = useState([
    { 
      id: 1, 
      date: "2025-01-20", 
      client: "Padaria Central", 
      delivered: 100, 
      returned: 15, 
      sold: 85, 
      status: "Em Aberto" 
    },
    { 
      id: 2, 
      date: "2025-01-19", 
      client: "Mercado Silva", 
      delivered: 80, 
      returned: 8, 
      sold: 72, 
      status: "Finalizado" 
    },
    { 
      id: 3, 
      date: "2025-01-19", 
      client: "Lanchonete Boa Vista", 
      delivered: 60, 
      returned: 0, 
      sold: 60, 
      status: "Finalizado" 
    },
    { 
      id: 4, 
      date: "2025-01-18", 
      client: "Padaria Central", 
      delivered: 90, 
      returned: 12, 
      sold: 78, 
      status: "Finalizado" 
    },
  ]);

  const [formData, setFormData] = useState({
    client: "",
    product: "",
    quantity: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Consignação registrada!",
      description: "A consignação foi cadastrada com sucesso.",
    });
    setFormData({ client: "", product: "", quantity: "" });
  };

  const getStatusBadge = (status: string) => {
    if (status === "Em Aberto") {
      return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">Em Aberto</Badge>;
    }
    return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Finalizado</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Consignação</h1>
          <p className="text-muted-foreground">Controle de entregas e devoluções</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Consignação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Consignação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client">Cliente</Label>
                <Select value={formData.client} onValueChange={(value) => setFormData({ ...formData, client: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="padaria">Padaria Central</SelectItem>
                    <SelectItem value="mercado">Mercado Silva</SelectItem>
                    <SelectItem value="lanchonete">Lanchonete Boa Vista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="product">Produto</Label>
                <Select value={formData.product} onValueChange={(value) => setFormData({ ...formData, product: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tradicional">Pão de Queijo Tradicional</SelectItem>
                    <SelectItem value="recheado">Pão de Queijo Recheado</SelectItem>
                    <SelectItem value="integral">Pão de Queijo Integral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade Entregue (kg)</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="0"
                />
              </div>
              <Button type="submit" className="w-full">
                Registrar Consignação
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Entregue (Hoje)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">240 kg</div>
            <p className="text-xs text-muted-foreground">3 entregas realizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Devoluções (Hoje)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23 kg</div>
            <p className="text-xs text-muted-foreground">Taxa de 9.6%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Aberto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Aguardando fechamento</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Consignações</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Entregue (kg)</TableHead>
                <TableHead>Devolvido (kg)</TableHead>
                <TableHead>Vendido (kg)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consignments.map((consignment) => (
                <TableRow key={consignment.id}>
                  <TableCell>{new Date(consignment.date).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="font-medium">{consignment.client}</TableCell>
                  <TableCell>{consignment.delivered}</TableCell>
                  <TableCell className={consignment.returned > 0 ? "text-warning font-medium" : ""}>
                    {consignment.returned}
                  </TableCell>
                  <TableCell className="text-success font-medium">{consignment.sold}</TableCell>
                  <TableCell>{getStatusBadge(consignment.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Consignment;
