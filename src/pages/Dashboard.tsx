import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, TrendingUp, DollarSign } from "lucide-react";

const Dashboard = () => {
  const stats = [
    {
      title: "Estoque Total",
      value: "2.458",
      subtitle: "unidades",
      icon: Package,
      color: "text-blue-600",
    },
    {
      title: "Vendas Hoje",
      value: "R$ 3.245,00",
      subtitle: "23 vendas",
      icon: ShoppingCart,
      color: "text-green-600",
    },
    {
      title: "Contas a Receber",
      value: "R$ 12.890,00",
      subtitle: "15 pendentes",
      icon: TrendingUp,
      color: "text-orange-600",
    },
    {
      title: "Contas a Pagar",
      value: "R$ 5.430,00",
      subtitle: "8 pendentes",
      icon: DollarSign,
      color: "text-red-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard teste git</h1>
        <p className="text-muted-foreground">
          Visão geral do seu negócio
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Produtos com Estoque Baixo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["Pão de Queijo Tradicional", "Pão de Queijo Recheado", "Pão de Queijo Integral"].map(
                (product, i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-2">
                    <span className="text-sm">{product}</span>
                    <span className="text-sm font-medium text-warning">
                      {45 - i * 10} unid.
                    </span>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimas Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["Padaria Central", "Mercado Silva", "Lanchonete Boa Vista"].map((client, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm">{client}</span>
                  <span className="text-sm font-medium text-success">
                    R$ {(Math.random() * 500 + 200).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
