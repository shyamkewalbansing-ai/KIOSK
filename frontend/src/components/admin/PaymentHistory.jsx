import { useState, useEffect } from 'react';
import { CreditCard, Search, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatSRD(amount) {
  return `SRD ${Number(amount || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TYPE_LABELS = {
  rent: 'Huur',
  partial_rent: 'Deel huur',
  service_costs: 'Servicekosten',
  fines: 'Boetes',
  deposit: 'Borgsom',
};

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await axios.get(`${API}/payments`, { withCredentials: true });
        setPayments(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  const filtered = payments.filter(p =>
    p.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.apartment_number?.toLowerCase().includes(search.toLowerCase()) ||
    p.receipt_number?.toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = filtered.reduce((sum, p) => sum + (p.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-[#1e3a8a] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="payment-history">
      {/* Search & total */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            data-testid="payment-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek op naam, appartement, bonnr..."
            className="pl-9 h-10 rounded-xl"
          />
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Totaal ({filtered.length} betalingen)</p>
          <p className="text-lg font-bold text-green-700">{formatSRD(totalAmount)}</p>
        </div>
      </div>

      {/* Table */}
      <Card className="border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-xs font-bold">Datum</TableHead>
                <TableHead className="text-xs font-bold">Huurder</TableHead>
                <TableHead className="text-xs font-bold">Appt.</TableHead>
                <TableHead className="text-xs font-bold">Type</TableHead>
                <TableHead className="text-xs font-bold">Bonnr.</TableHead>
                <TableHead className="text-xs font-bold text-right">Bedrag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-gray-400">
                    Geen betalingen gevonden
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.payment_id} data-testid={`payment-row-${p.payment_id}`} className="hover:bg-gray-50">
                    <TableCell className="text-xs text-gray-600">
                      {new Date(p.created_at).toLocaleDateString('nl-NL')}
                      <br />
                      <span className="text-gray-400">
                        {new Date(p.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-sm">{p.tenant_name}</TableCell>
                    <TableCell className="text-sm">{p.apartment_number}</TableCell>
                    <TableCell>
                      <span className="text-xs font-medium px-2 py-1 bg-blue-50 text-[#1e3a8a] rounded-full">
                        {TYPE_LABELS[p.payment_type] || p.payment_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-gray-500">{p.receipt_number}</TableCell>
                    <TableCell className="text-right font-bold text-green-700">{formatSRD(p.amount)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
