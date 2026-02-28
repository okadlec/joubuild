import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Org {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export default async function OrganizationPage() {
  const supabase = await createClient();

  const { data: orgs } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at') as { data: Org[] | null };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Organizace</h1>
        <p className="text-sm text-muted-foreground">Správa firem a členů</p>
      </div>

      {(!orgs || orgs.length === 0) ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <p className="mb-2 text-lg font-medium">Žádná organizace</p>
          <p className="text-sm text-muted-foreground">Organizace bude vytvořena automaticky při vytvoření prvního projektu</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orgs.map((org) => (
            <Card key={org.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{org.name}</CardTitle>
                  <Badge variant="secondary">{org.plan}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Slug: {org.slug}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
