import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Network, Download, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function NetworkAnalysisChart({ cases = [] }) {
  const canvasRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!cases.length) return;

    // Build network graph from cases
    const walletNodes = new Map();
    const connections = [];

    cases.forEach(c => {
      const victimWallet = c.victim_wallet;
      const scammerWallet = c.scammer_wallet;
      const monitoredWallets = c.monitored_wallets || [];

      // Add victim node
      if (victimWallet) {
        if (!walletNodes.has(victimWallet)) {
          walletNodes.set(victimWallet, {
            id: victimWallet,
            type: 'victim',
            cases: [],
            totalLoss: 0,
            x: Math.random() * 600,
            y: Math.random() * 400
          });
        }
        const node = walletNodes.get(victimWallet);
        node.cases.push(c.id);
        node.totalLoss += c.amount_lost || 0;
      }

      // Add scammer node
      if (scammerWallet) {
        if (!walletNodes.has(scammerWallet)) {
          walletNodes.set(scammerWallet, {
            id: scammerWallet,
            type: 'scammer',
            cases: [],
            totalLoss: 0,
            x: Math.random() * 600,
            y: Math.random() * 400
          });
        }
        const node = walletNodes.get(scammerWallet);
        node.cases.push(c.id);
        node.totalLoss += c.amount_lost || 0;

        // Create link between victim and scammer
        if (victimWallet && scammerWallet) {
          connections.push({
            source: victimWallet,
            target: scammerWallet,
            value: c.amount_lost || 0,
            caseId: c.id
          });
        }
      }

      // Add monitored wallets
      monitoredWallets.forEach(wallet => {
        if (!walletNodes.has(wallet)) {
          walletNodes.set(wallet, {
            id: wallet,
            type: 'monitored',
            cases: [c.id],
            totalLoss: 0,
            x: Math.random() * 600,
            y: Math.random() * 400
          });
        }
      });
    });

    setNodes(Array.from(walletNodes.values()));
    setLinks(connections);
    renderNetwork(Array.from(walletNodes.values()), connections);
  }, [cases, zoom]);

  const renderNetwork = (nodeList, linkList) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Apply zoom
    ctx.save();
    ctx.scale(zoom, zoom);

    // Draw links
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
    ctx.lineWidth = 1;
    linkList.forEach(link => {
      const source = nodeList.find(n => n.id === link.source);
      const target = nodeList.find(n => n.id === link.target);
      if (source && target) {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
      }
    });

    // Draw nodes
    nodeList.forEach(node => {
      const radius = Math.min(20, 5 + (node.cases.length * 3));
      
      // Node color based on type
      if (node.type === 'scammer') {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
      } else if (node.type === 'victim') {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
      } else {
        ctx.fillStyle = 'rgba(168, 85, 247, 0.8)';
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fill();

      // Node border
      ctx.strokeStyle = node.id === selectedNode?.id ? '#fff' : 'rgba(6, 182, 212, 0.6)';
      ctx.lineWidth = node.id === selectedNode?.id ? 3 : 1;
      ctx.stroke();

      // Label (truncated)
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      const label = node.id.substring(0, 8) + '...';
      ctx.fillText(label, node.x - 20, node.y - radius - 5);
    });

    ctx.restore();
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Find clicked node
    const clicked = nodes.find(n => {
      const dx = n.x - x;
      const dy = n.y - y;
      const radius = Math.min(20, 5 + (n.cases.length * 3));
      return Math.sqrt(dx * dx + dy * dy) < radius;
    });

    setSelectedNode(clicked || null);
  };

  const exportNetwork = () => {
    const canvas = canvasRef.current;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'network_analysis.png';
    a.click();
    toast.success('Network diagram exported');
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            Wallet Network Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-cyan-500/30 text-cyan-400"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-cyan-500/30 text-cyan-400"
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-cyan-500/30 text-cyan-400"
              onClick={exportNetwork}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              className="w-full bg-[#0f1419] rounded-lg border border-cyan-500/20 cursor-pointer"
              onClick={handleCanvasClick}
            />
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
              <h4 className="text-white font-semibold mb-3">Legend</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-300">Victim Wallet</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-red-500" />
                  <span className="text-xs text-gray-300">Scammer Wallet</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-purple-500" />
                  <span className="text-xs text-gray-300">Monitored</span>
                </div>
              </div>
            </div>

            {selectedNode && (
              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                <h4 className="text-white font-semibold mb-3">Selected Node</h4>
                <Badge className={`mb-2 ${
                  selectedNode.type === 'scammer' ? 'bg-red-500/20 text-red-400' :
                  selectedNode.type === 'victim' ? 'bg-green-500/20 text-green-400' :
                  'bg-purple-500/20 text-purple-400'
                }`}>
                  {selectedNode.type}
                </Badge>
                <p className="text-xs text-gray-400 font-mono mb-2 break-all">
                  {selectedNode.id}
                </p>
                <div className="space-y-1">
                  <p className="text-xs text-gray-300">
                    Cases: <span className="text-cyan-400">{selectedNode.cases.length}</span>
                  </p>
                  <p className="text-xs text-gray-300">
                    Total Loss: <span className="text-red-400">${selectedNode.totalLoss.toLocaleString()}</span>
                  </p>
                </div>
              </div>
            )}

            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
              <h4 className="text-white font-semibold mb-3">Network Stats</h4>
              <div className="space-y-2">
                <p className="text-xs text-gray-300">
                  Total Nodes: <span className="text-cyan-400">{nodes.length}</span>
                </p>
                <p className="text-xs text-gray-300">
                  Connections: <span className="text-cyan-400">{links.length}</span>
                </p>
                <p className="text-xs text-gray-300">
                  Scammers: <span className="text-red-400">{nodes.filter(n => n.type === 'scammer').length}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}