import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Activity, Zap, TrendingUp, TrendingDown } from "lucide-react";

export default function LiveConnectionIndicator({ device, server }) {
  const [dataRate, setDataRate] = useState({ rx: 0, tx: 0 });
  const [prevData, setPrevData] = useState(null);

  useEffect(() => {
    if (!device.data_transfer) return;

    if (prevData) {
      const timeDiff = 3; // 3 second polling interval
      const rxDiff = (device.data_transfer.rx_bytes - prevData.rx_bytes) / 1024 / timeDiff; // KB/s
      const txDiff = (device.data_transfer.tx_bytes - prevData.tx_bytes) / 1024 / timeDiff; // KB/s
      
      setDataRate({ rx: rxDiff, tx: txDiff });
    }

    setPrevData(device.data_transfer);
  }, [device.data_transfer]);

  if (!device.connected) {
    return (
      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50">
        Disconnected
      </Badge>
    );
  }

  const hasActivity = dataRate.rx > 1 || dataRate.tx > 1;

  return (
    <div className="flex items-center gap-2">
      <Badge className="bg-green-500/20 text-green-400 border-green-500/50 relative">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2" />
        Connected
      </Badge>
      
      {hasActivity && (
        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 animate-pulse">
          <Activity className="w-3 h-3 mr-1 animate-spin" />
          Active
        </Badge>
      )}

      {dataRate.rx > 1 && (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
          <TrendingDown className="w-3 h-3 mr-1" />
          {dataRate.rx.toFixed(0)} KB/s
        </Badge>
      )}

      {dataRate.tx > 1 && (
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
          <TrendingUp className="w-3 h-3 mr-1" />
          {dataRate.tx.toFixed(0)} KB/s
        </Badge>
      )}
    </div>
  );
}