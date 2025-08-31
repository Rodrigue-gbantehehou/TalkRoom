import { useRef, useCallback, useEffect } from 'react';
import { Message } from '@/types/chat';

interface UseWebRTCProps {
  onMessage?: (message: Message) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  localUserId: string;
  localUsername: string;
}

export function useWebRTC({ onMessage, onConnectionStateChange, localUserId, localUsername }: UseWebRTCProps) {
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const dataChannels = useRef<Map<string, RTCDataChannel>>(new Map());

  const createPeerConnection = useCallback((remoteUserId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    pc.onconnectionstatechange = () => {
      onConnectionStateChange?.(pc.connectionState);
    };

    pc.ondatachannel = (event) => {
      const channel = event.channel;
      dataChannels.current.set(remoteUserId, channel);
      
      channel.onmessage = (event) => {
        try {
          const message: Message = JSON.parse(event.data);
          onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse P2P message:', error);
        }
      };
    };

    peerConnections.current.set(remoteUserId, pc);
    return pc;
  }, [onMessage, onConnectionStateChange]);

  const createOffer = useCallback(async (remoteUserId: string): Promise<RTCSessionDescriptionInit> => {
    const pc = createPeerConnection(remoteUserId);
    
    // Create data channel for messaging
    const channel = pc.createDataChannel('messages', {
      ordered: true
    });
    
    dataChannels.current.set(remoteUserId, channel);
    
    channel.onmessage = (event) => {
      try {
        const message: Message = JSON.parse(event.data);
        onMessage?.(message);
      } catch (error) {
        console.error('Failed to parse P2P message:', error);
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }, [createPeerConnection, onMessage]);

  const createAnswer = useCallback(async (remoteUserId: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> => {
    const pc = createPeerConnection(remoteUserId);
    await pc.setRemoteDescription(offer);
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }, [createPeerConnection]);

  const handleAnswer = useCallback(async (remoteUserId: string, answer: RTCSessionDescriptionInit) => {
    const pc = peerConnections.current.get(remoteUserId);
    if (pc) {
      await pc.setRemoteDescription(answer);
    }
  }, []);

  const handleIceCandidate = useCallback(async (remoteUserId: string, candidate: RTCIceCandidateInit) => {
    const pc = peerConnections.current.get(remoteUserId);
    if (pc) {
      await pc.addIceCandidate(candidate);
    }
  }, []);

  const sendMessage = useCallback((message: Message, targetUserId?: string) => {
    const messageStr = JSON.stringify(message);
    
    if (targetUserId) {
      // Send to specific user
      const channel = dataChannels.current.get(targetUserId);
      if (channel && channel.readyState === 'open') {
        channel.send(messageStr);
      }
    } else {
      // Broadcast to all connected peers
      dataChannels.current.forEach((channel) => {
        if (channel.readyState === 'open') {
          channel.send(messageStr);
        }
      });
    }
  }, []);

  const disconnect = useCallback(() => {
    peerConnections.current.forEach((pc) => {
      pc.close();
    });
    peerConnections.current.clear();
    dataChannels.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    createOffer,
    createAnswer,
    handleAnswer,
    handleIceCandidate,
    sendMessage,
    disconnect,
    peerConnections: peerConnections.current
  };
}
