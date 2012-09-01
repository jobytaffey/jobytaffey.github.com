function MemoryProxy(owner, size, blockSize) {
	this.owner = owner;
	this.blocks = [];
	this.blockSize = blockSize;
	this.mask = (1 << blockSize) - 1;
	if (blockSize) {
		for (var i = 0; i < (size >> blockSize); ++i) {
			this.blocks.push(new MemoryBlock(1 << blockSize));
		}
	} else {
		this.blockSize = 31;
		this.mask = -1;
		this.blocks[0] = new MemoryBlock(size);
	}
};

MemoryProxy.prototype.load8 = function(offset) {
	return this.blocks[offset >> this.blockSize].load8(offset & this.mask);
};

MemoryProxy.prototype.load16 = function(offset) {
	return this.blocks[offset >> this.blockSize].load16(offset & this.mask);
};

MemoryProxy.prototype.loadU8 = function(offset) {
	return this.blocks[offset >> this.blockSize].loadU8(offset & this.mask);
};

MemoryProxy.prototype.loadU16 = function(offset) {
	return this.blocks[offset >> this.blockSize].loadU16(offset & this.mask);
};

MemoryProxy.prototype.load32 = function(offset) {
	return this.blocks[offset >> this.blockSize].load32(offset & this.mask);
};

MemoryProxy.prototype.store8 = function(offset, value) {
	this.owner.memoryDirtied(this, offset >> this.blockSize);
	return this.blocks[offset >> this.blockSize].store8(offset & this.mask, value);
};

MemoryProxy.prototype.store16 = function(offset, value) {
	this.owner.memoryDirtied(this, offset >> this.blockSize);
	return this.blocks[offset >> this.blockSize].store16(offset & this.mask, value);
};

MemoryProxy.prototype.store32 = function(offset, value) {
	this.owner.memoryDirtied(this, offset >> this.blockSize);
	return this.blocks[offset >> this.blockSize].store32(offset & this.mask, value);
};

MemoryProxy.prototype.invalidatePage = function(address) {};

function GameBoyAdvanceRenderProxy() {
	this.worker = new Worker('js/video/worker.js');

	this.currentFrame = 0;
	this.lastSeen = 0;
	this.lastSent = 0;
	this.skipFrame = false;

	this.dirty = {};
	var self = this;
	var handlers = {
		finish: function(data) {
			self.backing = data.backing;
			self.caller.finishDraw(self.backing);
			self.lastSeen = data.frame;
		}
	};
	this.worker.onmessage = function(message) {
		handlers[message.data['type']](message.data);
	}
};

GameBoyAdvanceRenderProxy.prototype.memoryDirtied = function(mem, block) {
	this.dirty.memory = this.dirty.memory || {};
	if (mem === this.palette) {
		this.dirty.memory.palette = mem.blocks[0].buffer;
	}
	if (mem === this.oam) {
		this.dirty.memory.oam = mem.blocks[0].buffer;
	}
	if (mem === this.vram) {
		this.dirty.memory.vram = this.dirty.memory.vram || [];
		this.dirty.memory.vram[block] = mem.blocks[block].buffer;
	}
};

GameBoyAdvanceRenderProxy.prototype.clear = function(mmu) {
	this.palette = new MemoryProxy(this, mmu.SIZE_PALETTE_RAM, 0);
	this.vram = new MemoryProxy(this, mmu.SIZE_VRAM, 11);
	this.oam = new MemoryProxy(this, mmu.SIZE_OAM, 0);

	this.dirty = {};

	this.worker.postMessage({ type: 'clear', SIZE_VRAM: mmu.SIZE_VRAM, SIZE_OAM: mmu.SIZE_OAM });
};

GameBoyAdvanceRenderProxy.prototype.writeDisplayControl = function(value) {
	this.dirty.DISPCNT = value;
};

GameBoyAdvanceRenderProxy.prototype.writeBackgroundControl = function(bg, value) {
	this.dirty.BGCNT = this.dirty.BGCNT || [];
	this.dirty.BGCNT[bg] = value;
};

GameBoyAdvanceRenderProxy.prototype.writeBackgroundHOffset = function(bg, value) {
	this.dirty.BGHOFS = this.dirty.BGHOFS || [];
	this.dirty.BGHOFS[bg] = value;
};

GameBoyAdvanceRenderProxy.prototype.writeBackgroundVOffset = function(bg, value) {
	this.dirty.BGVOFS = this.dirty.BGVOFS || [];
	this.dirty.BGVOFS[bg] = value;
};

GameBoyAdvanceRenderProxy.prototype.writeBackgroundRefX = function(bg, value) {
	this.dirty.BGX = this.dirty.BGX || [];
	this.dirty.BGX[bg] = value;
};

GameBoyAdvanceRenderProxy.prototype.writeBackgroundRefY = function(bg, value) {
	this.dirty.BGY = this.dirty.BGY || [];
	this.dirty.BGY[bg] = value;
};

GameBoyAdvanceRenderProxy.prototype.writeBackgroundParamA = function(bg, value) {
	this.dirty.BGPA = this.dirty.BGPA || [];
	this.dirty.BGPA[bg] = value;
};

GameBoyAdvanceRenderProxy.prototype.writeBackgroundParamB = function(bg, value) {
	this.dirty.BGPB = this.dirty.BGPB || [];
	this.dirty.BGPB[bg] = value;
};

GameBoyAdvanceRenderProxy.prototype.writeBackgroundParamC = function(bg, value) {
	this.dirty.BGPC = this.dirty.BGPC || [];
	this.dirty.BGPC[bg] = value;
};

GameBoyAdvanceRenderProxy.prototype.writeBackgroundParamD = function(bg, value) {
	this.dirty.BGPD = this.dirty.BGPD || [];
	this.dirty.BGPD[bg] = value;
};

GameBoyAdvanceRenderProxy.prototype.writeWin0H = function(value) {
	this.dirty.WIN0H = value;
};

GameBoyAdvanceRenderProxy.prototype.writeWin1H = function(value) {
	this.dirty.WIN1H = value;
};

GameBoyAdvanceRenderProxy.prototype.writeWin0V = function(value) {
	this.dirty.WIN0V = value;
};

GameBoyAdvanceRenderProxy.prototype.writeWin1V = function(value) {
	this.dirty.WIN1V = value;
};

GameBoyAdvanceRenderProxy.prototype.writeWinIn = function(value) {
	this.dirty.WININ = value;
};

GameBoyAdvanceRenderProxy.prototype.writeWinOut = function(value) {
	this.dirty.WINOUT = value;
};

GameBoyAdvanceRenderProxy.prototype.writeBlendControl = function(value) {
	this.dirty.BLDCNT = value;
};

GameBoyAdvanceRenderProxy.prototype.writeBlendAlpha = function(value) {
	this.dirty.BLDALPHA = value;
};

GameBoyAdvanceRenderProxy.prototype.writeBlendY = function(value) {
	this.dirty.BLDY = value;
};

GameBoyAdvanceRenderProxy.prototype.setBacking = function(backing) {
	this.backing = backing;
	this.worker.postMessage({ type: 'start', backing: this.backing });
};

GameBoyAdvanceRenderProxy.prototype.drawScanline = function(y) {
	if (!this.skipFrame) {
		this.worker.postMessage({ type: 'scanline', y: y, dirty: this.dirty });
		this.dirty = {};
	}
};

GameBoyAdvanceRenderProxy.prototype.startDraw = function() {
	++this.currentFrame;
};

GameBoyAdvanceRenderProxy.prototype.finishDraw = function(caller) {
	this.caller = caller;
	if (!this.skipFrame) {
		this.worker.postMessage({ type: 'finish', frame: this.currentFrame });
		this.lastSent = this.currentFrame;
		if (this.lastSent - this.lastSeen > 2) {
			this.skipFrame = true;
		}
	} else if (this.lastSeen - this.lastSent < 2) {
		this.skipFrame = false;
	}
};
