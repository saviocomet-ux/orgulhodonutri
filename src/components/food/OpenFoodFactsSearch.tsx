import { useState } from "react";
import { Search, Loader2, Plus, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image?: string;
  serving_size?: string;
}

interface OpenFoodFactsSearchProps {
  onSelect: (item: FoodItem) => void;
}

export const OpenFoodFactsSearch = ({ onSelect }: OpenFoodFactsSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);

  const searchFood = async () => {
    if (!query || query.length < 3) return;
    setLoading(true);
    try {
      // Usando o endpoint de busca do Open Food Facts
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`
      );
      const data = await response.json();

      if (data.products) {
        const parsed: FoodItem[] = data.products.map((p: any) => ({
          id: p.code,
          name: p.product_name || p.generic_name || "Produto desconhecido",
          brand: p.brands,
          calories: p.nutriments?.["energy-kcal_100g"] || 0,
          protein: p.nutriments?.proteins_100g || 0,
          carbs: p.nutriments?.carbohydrates_100g || 0,
          fat: p.nutriments?.fat_100g || 0,
          image: p.image_small_url,
          serving_size: p.serving_size,
        }));
        setResults(parsed);
        if (parsed.length === 0) toast.info("Nenhum alimento encontrado");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Erro ao conectar com o banco de alimentos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar no Banco de Alimentos..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchFood()}
          />
        </div>
        <Button onClick={searchFood} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
        </Button>
      </div>

      <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-1">
        {results.map((item) => (
          <Card key={item.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onSelect(item)}>
            <CardContent className="p-3">
              <div className="flex gap-3">
                {item.image && (
                  <img src={item.image} alt={item.name} className="h-12 w-12 rounded object-cover border" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.brand}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {item.calories} kcal
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-normal border-blue-200">
                      P: {item.protein}g
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-normal border-amber-200">
                      C: {item.carbs}g
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-normal border-rose-200">
                      G: {item.fat}g
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col justify-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {query && results.length === 0 && !loading && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Tente buscar por marcas ou nomes específicos de alimentos.
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-[10px] text-blue-600 dark:text-blue-400">
        <Info className="h-3 w-3" />
        <span>Valores nutricionais baseados em 100g do produto (Open Food Facts).</span>
      </div>
    </div>
  );
};
