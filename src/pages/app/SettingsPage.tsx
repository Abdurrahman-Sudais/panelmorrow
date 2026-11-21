import { toast } from "sonner";
import { Cloud, Database, FlaskConical, KeyRound, RefreshCw, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { repository } from "@/services/repository";
import { apiConfig, isMock } from "@/services/api/config";
import { MODEL_REGISTRY } from "@/services/api/models";
import { MODEL_VERSION } from "@/services/analysis/engine";
import { AWS_RESOURCES } from "@/services/aws/resources";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function SettingsPage() {
  const { session } = useAuth();
  return (
    <div>
      <PageHeader title="Settings & integrations" description="Workspace profile, AWS integration readiness and model configuration." />
      <Tabs defaultValue="integrations">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="integrations"><Cloud className="h-4 w-4" />AWS integrations</TabsTrigger>
          <TabsTrigger value="models"><FlaskConical className="h-4 w-4" />Models</TabsTrigger>
          <TabsTrigger value="profile"><User className="h-4 w-4" />Profile</TabsTrigger>
          <TabsTrigger value="demo"><Database className="h-4 w-4" />Demo data</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle>Environment</CardTitle>
                <CardDescription>The frontend only holds public configuration. All AWS access happens server-side.</CardDescription>
              </div>
              <Badge variant={isMock ? "simulated" : "verified"}>{isMock ? "Mock mode" : "Live mode"}</Badge>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-1.5"><Label>API mode</Label><Input readOnly value={apiConfig.mode} /></div>
              <div className="grid gap-1.5"><Label>API base URL</Label><Input readOnly value={apiConfig.baseUrl || "— (not set)"} /></div>
              <div className="grid gap-1.5"><Label>Cognito user pool</Label><Input readOnly value={apiConfig.cognito.userPoolId || "— (not set)"} /></div>
              <div className="flex gap-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-xs text-teal-900 md:col-span-3">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                No AWS access keys, secret keys or session tokens are bundled in this application. Requests to SageMaker, Bedrock, S3 and DynamoDB are made by backend Lambda functions using IAM roles; the browser authenticates with short-lived Cognito JWTs.
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>AWS services</CardTitle><CardDescription>Integration points prepared in the service layer (src/services/api)</CardDescription></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Service</TableHead><TableHead>Purpose</TableHead><TableHead>Resource</TableHead><TableHead>Called from</TableHead><TableHead>Demo status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {AWS_RESOURCES.map((r) => (
                    <TableRow key={r.service}>
                      <TableCell className="whitespace-nowrap font-semibold text-navy-900">{r.service}</TableCell>
                      <TableCell className="min-w-[200px] text-sm text-muted-foreground">{r.purpose}</TableCell>
                      <TableCell className="min-w-[200px] font-mono text-[11px]">{r.resource}</TableCell>
                      <TableCell className="min-w-[160px] text-xs text-muted-foreground">{r.calledFrom}</TableCell>
                      <TableCell><Badge variant={r.demoStatus === "Simulated" ? "simulated" : r.demoStatus === "Mocked in browser" ? "secondary" : "outline"}>{r.demoStatus}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models">
          <Card>
            <CardHeader><CardTitle>Registered models</CardTitle><CardDescription>Every prediction is tagged with the model version that produced it</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {MODEL_REGISTRY.map((m) => (
                <div key={m.endpoint} className="flex flex-col justify-between gap-2 rounded-lg border p-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-semibold text-navy-900">{m.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{m.endpoint} · {m.version}</p>
                  </div>
                  <Badge variant="simulated"><FlaskConical className="h-3 w-3" />Simulated — SageMaker endpoint not connected</Badge>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Anomaly model label shown in the UI: <span className="font-mono">{MODEL_VERSION}</span>. To connect real models, set <span className="font-mono">VITE_API_MODE=live</span> and implement the <span className="font-mono">/models/*</span> backend routes (see docs/ARCHITECTURE.md).</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <Card className="max-w-2xl">
            <CardHeader><CardTitle>Your profile</CardTitle><CardDescription>Managed by Amazon Cognito in production</CardDescription></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5"><Label>Name</Label><Input readOnly value={session?.user.name ?? ""} /></div>
              <div className="grid gap-1.5"><Label>Email</Label><Input readOnly value={session?.user.email ?? ""} /></div>
              <div className="grid gap-1.5"><Label>Company</Label><Input readOnly value={session?.user.company ?? ""} /></div>
              <div className="grid gap-1.5"><Label>Role</Label><Input readOnly value={session?.user.role ?? ""} /></div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2"><KeyRound className="h-4 w-4" />Password, MFA and SSO are configured in the identity provider.</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demo">
          <Card className="max-w-2xl">
            <CardHeader><CardTitle>Demonstration data</CardTitle><CardDescription>24 fictional sites with 180 days of simulated generation and weather, ending 20 Nov 2026</CardDescription></CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>Your changes (registered sites, uploads, anomaly statuses, queue decisions, maintenance records and weights) are stored in this browser only.</p>
              <Button
                variant="outline"
                onClick={() => {
                  if (!confirm("Reset all demo changes? Registered sites, uploads and records you added will be removed.")) return;
                  repository.resetDemo();
                  toast.success("Demo data reset");
                }}
              >
                <RefreshCw />Reset demo workspace
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
