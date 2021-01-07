import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";

const Container = styled.div`
  padding: 20px;
  display: flex;
  height: 100vh;
  width: 90%;
  margin: auto;
  flex-wrap: wrap;
`;

const StyleVideo = styled.video`
  height: 40%;
  width: 50%;
`;
const StyledAudio = styled.audio`
  height: 40%;
  width: 50%;
`;

const Video = (props) => {
  const ref = useRef();
  useEffect(() => {
    props.peer.on("stream", (stream) => {
      ref.current.srcObject = stream;
    });
  }, []);

  return <StyleVideo playsInline autoPlay ref={ref} />;
};

const videoConstraints = {
  height: window.innerHeight / 2,
  width: window.innerWidth / 2,
};

const Room = (props) => {
  const [peers, setPeers] = useState([]);
  const socketRef = useRef();
  const useVideo = useRef();
  const peersRef = useRef([]);
  const roomID = props.match.params.roomID;

  useEffect(() => {
    try {
      socketRef.current = io.connect("/");
      navigator.mediaDevices
        .getUserMedia({ video: videoConstraints, audio: true })
        .then((stream) => {
          useVideo.current.srcObject = stream;
          //   console.log(useAudio);
          socketRef.current.emit("join room", roomID);
          socketRef.current.on("all users", (user) => {
            console.log(user);

            const peers = [];
            user.forEach((userID) => {
              const peer = createPeer(userID, socketRef.current.id, stream);
              peersRef.current.push({ peerID: userID, peer });
              peers.push(peer);
              setPeers([...peers]);
            });
          });

          socketRef.current.on("user joined", (data) => {
            const peer = addPeer(data.signal, data.callerID, stream);
            peersRef.current.push({
              peerID: data.callerID,
              peer,
            });
            setPeers((users) => [...users, peer]);
          });

          socketRef.current.on("receiving returned signal", (data) => {
            const item = peersRef.current.find((y) => y.peerID === data.id);
            item.peer.signal(data.signal);
          });
        });
    } catch (error) {
      console.log(error);
    }
  }, []);

  function createPeer(userToSignal, callerID, stream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", (signal) => {
      socketRef.current.emit("sending signal", {
        userToSignal,
        callerID,
        signal,
      });
    });

    return peer;
  }

  function addPeer(incomingSignal, callerID, stream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on("signal", (signal) => {
      socketRef.current.emit("returning signal", { signal, callerID });
    });

    peer.signal(incomingSignal);

    return peer;
  }

  return (
    <Container>
      <StyleVideo muted ref={useVideo} autoPlay playsInline />
      {peers.map((peer, index) => {
        return <Video key={index} peer={peer} />;
      })}
    </Container>
  );
};

export default Room;
