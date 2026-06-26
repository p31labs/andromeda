 *













    const currentMembers = VERTICES.filter(v => this.leafKeys[VERTICES.indexOf(v)] !== null);
    const updatedMembers = [...new Set([...currentMembers.filter(m => !removedMembers.includes(m)), ...newMembers])];


    this.epoch = newEpoch;
    this.treeSecret = ratchetInput;
    this.epochSecrets.set(this.epoch, this.treeSecret);


    await this._updateInternalNodes();






    this.epoch = commit.epoch;












    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'commit', payload: commit }));
    }


