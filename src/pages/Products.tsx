import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, PackagePlus, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiService } from "@/services/api";

const Products = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddStockDialogOpen, setIsAddStockDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMovementsDialogOpen, setIsMovementsDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedProductForMovements, setSelectedProductForMovements] = useState<{ id: number; name: string } | null>(null);
  const [productToDelete, setProductToDelete] = useState<{ id: number; name: string } | null>(null);
  const [addStockData, setAddStockData] = useState({
    quantity: "",
    notes: "",
  });
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    stock: "",
    unit: "un",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Buscar produtos
  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiService.getProducts(),
  });

  // Calcular paginação
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return products.slice(startIndex, endIndex);
  }, [products, currentPage]);

  const totalPages = Math.ceil(products.length / itemsPerPage);

  // Resetar para primeira página quando os dados mudarem
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Buscar movimentações do produto selecionado
  const { data: movements = [], isLoading: isLoadingMovements } = useQuery({
    queryKey: ['productMovements', selectedProductForMovements?.id],
    queryFn: () => apiService.getProductMovements(selectedProductForMovements!.id),
    enabled: !!selectedProductForMovements && isMovementsDialogOpen,
  });

  // Mutation para criar produto
  const createMutation = useMutation({
    mutationFn: (data: { name: string; price: number; stock: number; unit: string }) =>
      apiService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Produto cadastrado!",
        description: "O produto foi adicionado com sucesso.",
      });
      setFormData({ name: "", price: "", stock: "", unit: "un" });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao cadastrar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar produto
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; price?: number; stock?: number; unit?: string } }) =>
      apiService.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Produto atualizado!",
        description: "O produto foi atualizado com sucesso.",
      });
      setFormData({ name: "", price: "", stock: "", unit: "un" });
      setEditingProduct(null);
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para desativar produto
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Produto desativado!",
        description: "O produto foi desativado e não poderá mais ser usado.",
      });
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao desativar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para adicionar estoque
  const addStockMutation = useMutation({
    mutationFn: ({ id, quantity, notes }: { id: number; quantity: number; notes?: string }) =>
      apiService.addProductStock(id, parseInt(quantity, 10), notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Estoque adicionado!",
        description: "O estoque foi atualizado com sucesso.",
      });
      setAddStockData({ quantity: "", notes: "" });
      setIsAddStockDialogOpen(false);
      setSelectedProductId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar estoque",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const productData = {
      name: formData.name,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock, 10),
      unit: formData.unit,
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct, data: productData });
    } else {
      createMutation.mutate(productData);
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product.id);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      stock: Math.floor(product.stock || 0).toString(),
      unit: product.unit || "un",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number, name: string) => {
    setProductToDelete({ id, name });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteMutation.mutate(productToDelete.id);
    }
  };

  const handleRowDoubleClick = (productId: number, productName: string) => {
    setSelectedProductForMovements({ id: productId, name: productName });
    setIsMovementsDialogOpen(true);
  };

  const getMovementTypeLabel = (type: string) => {
    if (type === 'entrada') return 'Entrada';
    if (type === 'saida') return 'Saída';
    return type;
  };

  const getMovementTypeBadge = (type: string) => {
    if (type === 'entrada') {
      return <Badge variant="outline" className="bg-success/10 text-success border-success/20">Entrada</Badge>;
    }
    return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Saída</Badge>;
  };

  const getReferenceLabel = (referenceType: string, referenceId: number | null) => {
    if (!referenceType) return '-';
    const labels: { [key: string]: string } = {
      'venda': 'Venda',
      'consignacao': 'Consignação',
      'producao': 'Produção',
      'ajuste': 'Ajuste',
    };
    const label = labels[referenceType] || referenceType;
    return referenceId ? `${label} #${referenceId}` : label;
  };

  const handleNewProduct = () => {
    setEditingProduct(null);
    setFormData({ name: "", price: "", stock: "", unit: "kg" });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
          <p className="text-muted-foreground">Gerencie seu catálogo de produtos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNewProduct}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Editar Produto" : "Cadastrar Produto"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Produto</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Pão de Queijo Tradicional"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço Unitário (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Estoque</Label>
                  <Input
                    id="stock"
                    type="number"
                    step="1"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Permitir apenas números inteiros
                      if (value === '' || /^\d+$/.test(value)) {
                        setFormData({ ...formData, stock: value });
                      }
                    }}
                    placeholder="0"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingProduct ? "Atualizar" : "Cadastrar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando produtos...</span>
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-destructive">Erro ao carregar produtos. Tente novamente.</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Nenhum produto cadastrado ainda.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Preço Unitário</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((product: any) => (
                  <TableRow 
                    key={product.id}
                    onDoubleClick={() => handleRowDoubleClick(product.id, product.name)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>R$ {parseFloat(product.price).toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={product.stock < 100 ? "text-warning font-medium" : ""}>
                        {product.stock} {product.unit || "un"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => {
                            setSelectedProductId(product.id);
                            setIsAddStockDialogOpen(true);
                          }}
                          title="Adicionar estoque"
                        >
                          <PackagePlus className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEdit(product)}
                          disabled={deleteMutation.isPending}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(product.id, product.name)}
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {/* Paginação */}
          {products.length > itemsPerPage && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, products.length)} de {products.length} produto(s)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Anterior</span>
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "outline" : "ghost"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-[40px]"
                        >
                          {page}
                        </Button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <span key={page} className="px-2 text-muted-foreground">...</span>
                      );
                    }
                    return null;
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  <span>Próxima</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para adicionar estoque */}
      <Dialog open={isAddStockDialogOpen} onOpenChange={setIsAddStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Estoque</DialogTitle>
            <DialogDescription>
              Adicione produtos ao estoque (produção ou entrada de mercadoria).
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedProductId || !addStockData.quantity) {
                toast({
                  title: "Campos obrigatórios",
                  description: "Preencha a quantidade.",
                  variant: "destructive",
                });
                return;
              }
              addStockMutation.mutate({
                id: selectedProductId,
                quantity: parseInt(addStockData.quantity, 10),
                notes: addStockData.notes || undefined,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade *</Label>
              <Input
                id="quantity"
                type="number"
                step="1"
                min="0"
                value={addStockData.quantity}
                onChange={(e) => {
                  const value = e.target.value;
                  // Permitir apenas números inteiros
                  if (value === '' || /^\d+$/.test(value)) {
                    setAddStockData({ ...addStockData, quantity: value });
                  }
                }}
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações (Opcional)</Label>
              <Textarea
                id="notes"
                value={addStockData.notes}
                onChange={(e) => setAddStockData({ ...addStockData, notes: e.target.value })}
                placeholder="Ex: Produção do dia, Recebimento de fornecedor, etc."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddStockDialogOpen(false);
                  setAddStockData({ quantity: "", notes: "" });
                }}
                disabled={addStockMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={addStockMutation.isPending}>
                {addStockMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <PackagePlus className="mr-2 h-4 w-4" />
                    Adicionar Estoque
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Movimentações do Produto */}
      <Dialog open={isMovementsDialogOpen} onOpenChange={setIsMovementsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Extrato de Movimentações - {selectedProductForMovements?.name}</DialogTitle>
            <DialogDescription>
              Histórico completo de entradas e saídas de estoque
            </DialogDescription>
          </DialogHeader>
          {isLoadingMovements ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando movimentações...</span>
            </div>
          ) : movements.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Nenhuma movimentação registrada para este produto.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead>Referência</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((movement: any) => {
                      const product = products.find((p: any) => p.id === selectedProductForMovements?.id);
                      const unit = product?.unit || "un";
                      
                      return (
                        <TableRow key={movement.id}>
                          <TableCell>
                            {movement.date 
                              ? new Date(movement.date).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {getMovementTypeBadge(movement.type)}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${movement.type === 'entrada' ? 'text-success' : 'text-destructive'}`}>
                            {movement.type === 'entrada' ? '+' : '-'}
                            {parseFloat(movement.quantity || 0).toFixed(2)} {unit}
                          </TableCell>
                          <TableCell>
                            {getReferenceLabel(movement.reference_type, movement.reference_id)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {movement.notes || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              
              {/* Resumo */}
              <div className="pt-4 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total de Entradas</p>
                    <p className="text-lg font-bold text-success">
                      +{movements
                        .filter((m: any) => m.type === 'entrada')
                        .reduce((sum: number, m: any) => sum + parseFloat(m.quantity || 0), 0)
                        .toFixed(2)} {products.find((p: any) => p.id === selectedProductForMovements?.id)?.unit || "un"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total de Saídas</p>
                    <p className="text-lg font-bold text-destructive">
                      -{movements
                        .filter((m: any) => m.type === 'saida')
                        .reduce((sum: number, m: any) => sum + parseFloat(m.quantity || 0), 0)
                        .toFixed(2)} {products.find((p: any) => p.id === selectedProductForMovements?.id)?.unit || "un"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">Estoque Atual</p>
                    <p className="text-xl font-bold">
                      {products.find((p: any) => p.id === selectedProductForMovements?.id)?.calculated_stock?.toFixed(2) || 
                       products.find((p: any) => p.id === selectedProductForMovements?.id)?.stock?.toFixed(2) || 
                       "0.00"} {products.find((p: any) => p.id === selectedProductForMovements?.id)?.unit || "un"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsMovementsDialogOpen(false);
                    setSelectedProductForMovements(null);
                  }}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de desativação */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar Produto</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desativar este produto?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-warning/10 border border-warning/20 rounded-md">
              <p className="text-sm text-foreground">
                <strong>Produto: {productToDelete?.name}</strong>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Uma vez desativado, este produto não poderá mais ser usado em vendas, consignações ou outras operações. 
                O registro será mantido no sistema apenas para fins de histórico.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setProductToDelete(null);
                }}
                disabled={deleteMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Desativando...
                  </>
                ) : (
                  "Desativar Produto"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
