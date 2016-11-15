
var Canvas;
var DrawContext;
var SelectorID = -1;
var GroupID = -1;
var IsMobile = false;
var Timer = undefined;
var Background = undefined;
var PassedTests = [];

//GAME ENGINE
var scope = {
  GetTime: function(){
    dt = new Date();
    return dt.getTime();
  },
  SetText: function(LabelName, Text){
    lbl = this.StaticText[LabelName];
    if (lbl !== undefined){
      lbl.Text = String(Text);
    } else {
      throw new Error('Static Text named "' + LabelName + '" was not found!');
    }
  },
  GetLabel: function(LabelName){
    lbl = this.StaticText[LabelName];
    if (lbl !== undefined){
      return lbl;
    } else {
      throw new Error('Static Text named "' + LabelName + '" was not found!');
    }
  },
  GetImage: function(ImageName){
    img = this.StaticImages[ImageName];
    if (img !== undefined){
      return img;
    } else {
      throw new Error('StaticImage named "' + ImageName + '" was not found!');
    }
  },
  Events:{
    StandartEvents:{
      Codes: {
        NOP: 0,
        Paint: 1
      },
      DoStandartEvent: function(id){
        switch(id){
          case scope.Events.StandartEvents.Codes.NOP:
            break;
          case scope.Events.StandartEvents.Codes.Paint:
            Paint();
            break;
        }
      }
    },
    Queue: [],
    AddEvent: function(handler, delay){
      this.Queue.push({Handler: handler, Delay: delay});
      if (!scope.Updating)
        MessagesLoop();
    },
    AddEmptyEvent: function(){
      if (!scope.Updating)
        MessagesLoop();
    },
    DoEvents: function(){
      Repaint = false;
      for(i=0;i<this.Queue.length;i++){
        var current = this.Queue[i];
        current.Delay--;
        if (current.Delay <= 0) {
          this.Queue.splice(i, 1);
          if(typeof current.Handler === 'number'){
            if(current.Handler === scope.Events.StandartEvents.Codes.Paint)
              Repaint = true;
            else
              scope.Events.StandartEvents.DoStandartEvent(current.Handler);
          }
          else if (Array.isArray(current.Handler)) {
            for(j=0;j<current.Handler.length;j++){
              if(typeof current.Handler[j] === 'number')
                 scope.Events.StandartEvents.DoStandartEvent(current.Handler[j]);
              else
                current.Handler[j](scope);
            }
          }else{
            current.Handler(scope);
          }
        }
      }
      if(Repaint)
        Paint();
    }
  },
  LoadedImageCount: 0,
  TotalImages: 1,
  loader: function() {
    if (scope.LoadedImageCount === undefined) {
      scope.LoadedImageCount = 1;
    } else{
      scope.LoadedImageCount++;
    }
    if (scope.LoadedImageCount >= scope.TotalImages) {
      scope.Events.AddEvent(scope.Events.StandartEvents.Codes.Paint, 0);
    }
  }
}

function detectIE() {
  userAgent = window.navigator.userAgent;
  return userAgent.indexOf("MSIE ") !== -1 || userAgent.indexOf("Trident/") !== -1 || userAgent.indexOf("Edge/") !== -1;
}

var CMD = {
  Size: {
    Plus: function (SB) {
      if (SB.CurrentScale >= SB.Max)
        return;
      SB.CurrentScale += SB.Step;
      Scale();
      scope.Events.AddEvent(scope.Events.StandartEvents.Codes.Paint, 0);
    },
    Minus: function (SB) {
      if (SB.CurrentScale <= SB.Min)
        return;
      SB.CurrentScale -= SB.Step;
      Scale();
      scope.Events.AddEvent(scope.Events.StandartEvents.Codes.Paint, 0);
    }
  },
  Control: {
    Save: function(Canvas, FileName){
        Paint();
        PausePaint = true;
        var image = Canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
  			PausePaint = false;
				if(detectIE() !== true){
          var aLink = document.createElement('a');
					var evt = undefined;
					try{
						evt = new MouseEvent('click');
					} catch(ex){
						evt = document.createEvent('Event');
						evt.initEvent('click', true, true);
					}
					aLink.download = FileName + '.png';
					aLink.href = image;
					aLink.dispatchEvent(evt);
				} else {
          var binary = atob(image.split(',')[1]);
          var array = [];
          for(var i = 0; i < binary.length; i++) {
            array.push(binary.charCodeAt(i));
          }
          var blob = new Blob([new Uint8Array(array)], {type: 'image/png'});
          window.navigator.msSaveOrOpenBlob(blob, FileName+".png");
	  }
    },
    ResetSelectorsMovement: function(scope){
      counter = 0;
      for(i=0;i<Selectors.length;i++){
        if (Selectors[i].StartPosition !== undefined) {
          Selectors[i].X = Selectors[i].StartPosition.X;
          Selectors[i].Y = Selectors[i].StartPosition.Y;
          PassedTests[Selectors[i].GroupID] = 0;
          Selectors[i].StartPosition = undefined;
          counter++;
        }
      }
      for(i=0;i<Test.length;i++)
        Test[i].Passed = false;
      PassedTests = [];
      if (counter > 0)
        scope.Events.AddEvent(scope.Events.StandartEvents.Codes.Paint, 0);
    }
  }
};

if (typeof MyHandlers !== 'undefined') {
  CMD.Custom = MyHandlers;
}

//MESSAGES

function BeforeInit() {
  if (Messages === undefined)
    return;
  if (Messages.BeforeInit === undefined)
    return;
  Messages.BeforeInit(scope);
}

function AfterInit() {
  if (Messages === undefined)
    return;
  if (Messages.AfterInit === undefined)
    return;
  Messages.AfterInit(Canvas);
}

function AfterResize() {
  if (Messages === undefined)
    return;
  if (Messages.AfterResize === undefined)
    return;
  Messages.AfterResize(Canvas);
}

function BeforeGameInit() {
  if (Messages === undefined)
    return;
  if (Messages.BeforeGameInit === undefined)
    return;
  Messages.BeforeGameInit(scope);
}

function AfterGameInit(){
  if (Messages === undefined)
    return;
  if (Messages.GameLoaded === undefined)
    return;
  Messages.AfterGameInit(scope);
}

function SetSelector(ID, GID) {
  SelectorID = ID;
  GroupID = GID;
}

function Clone(obj) {
  if (null === obj || "object" != typeof obj) return obj;
  var copy = obj.constructor();
  for (var attr in obj) {
    if (obj.hasOwnProperty(attr))
      copy[attr] = obj[attr];
  }
  return copy;
}

function CloneObjectArray(Arr) {
  res = [];
  for (i = 0; i < Arr.length; i++) {
    res[i] = Clone(Arr[i]);
  }
  return res;
}

function GetSelector(X, Y) {
  for (i = 0; i < Selectors.length; i++) {
    if (Flags.FreezeCoordinates === true && PassedTests[Selectors[i].GroupID] === 1)
      continue;
    if (Selectors[i].R === undefined) {
      Distance = Math.sqrt(Math.pow(X - Selectors[i].X, 2) + Math.pow(Y - Selectors[i].Y, 2));
      if (Distance < (Selectors[i].RootOffsetX + Selectors[i].RootOffsetY) * 0.5) {
        SetSelector(i, Selectors[i].GroupID);
        break;
      }
    } else {
      Distance = Math.sqrt(Math.pow(X - Selectors[i].X, 2) + Math.pow(Y - Selectors[i].Y, 2));
      if (Distance < Selectors[i].R) {
        SetSelector(i, Selectors[i].GroupID);
        break;
      }
    }
  }
}

function FromIdToCoords(obj) {
  if (obj.R !== undefined) {
    if (obj.X < 0)
      obj.X = OffsetData.X + CellGridSize * Math.abs(obj.X + 1) + obj.R / 2;
    if (obj.Y < 0)
      obj.Y = OffsetData.Y + CellGridSize * Math.abs(obj.Y + 1) - obj.R / 2;
  }
  else {
    if (obj.X)
      obj.X = OffsetData.X + CellGridSize * Math.abs(obj.X + 1) + obj.RootOffsetX / 2;
    if (obj.Y)
      obj.Y = OffsetData.Y + CellGridSize * Math.abs(obj.Y + 1) - obj.RootOffsetY / 2;
  }
}

function FromIdToCoordsForce(obj) {
  if (obj.R !== undefined) {
    obj.X = OffsetData.X + CellGridSize * Math.abs(obj.X - 1) + obj.R / 2;
    obj.Y = OffsetData.Y + CellGridSize * Math.abs(obj.Y - 1) - obj.R / 2;
  }
  else {
    obj.X = OffsetData.X + CellGridSize * Math.abs(obj.X - 1) + obj.RootOffsetX / 2;
    obj.Y = OffsetData.Y + CellGridSize * Math.abs(obj.Y - 1) - obj.RootOffsetY / 2;
  }
}

function ConvertRelativeCoords() {
  if (Flags.UsePixelCoordinates)
    return;
  if (Selectors !== undefined) {
    for (i = 0; i < Selectors.length; i++) {
      FromIdToCoords(Selectors[i]);
    }
  }
  if (Test !== undefined) {
    for (i = 0; i < Test.length; i++) {
      FromIdToCoordsForce(Test[i]);
    }
  }
}

function SaveDefaultSettings() {
  SizeButtons.DefaultValues = {};
  SizeButtons.DefaultValues.Canvas = {
    Width: Canvas.width,
    Height: Canvas.height
  };
  SizeButtons.DefaultValues.TextSizeMain = TextSizeMain;
  SizeButtons.DefaultValues.TextSizeData = TextSizeData;
  SizeButtons.DefaultValues.TextSizeScale = TextSizeScale;
  SizeButtons.DefaultValues.LinesWidth = LinesWidth;
  SizeButtons.DefaultValues.CellGridSize = CellGridSize;
  SizeButtons.DefaultValues.OffsetGlobal = Clone(OffsetGlobal);
  SizeButtons.DefaultValues.OffsetHeader = Clone(OffsetHeader);
  SizeButtons.DefaultValues.OffsetGrid = Clone(OffsetGrid);
  SizeButtons.DefaultValues.OffsetData = Clone(OffsetData);
  SizeButtons.DefaultValues.Radius = Radius;
  SizeButtons.DefaultValues.Selectors = CloneObjectArray(Selectors);
  SizeButtons.DefaultValues.Test = CloneObjectArray(Test);
  SizeButtons.DefaultValues.StaticImages = CloneObjectArray(StaticImages);
  SizeButtons.DefaultValues.SizeButtonsPos = Clone(SizeButtons.Position);
  SizeButtons.DefaultValues.SizeButtonsTextSize = Clone(SizeButtons.TextSize);
  SizeButtons.DefaultValues.StaticText = CloneObjectArray(StaticText);
}

function GetIterator(v) {
  res = {};
  if (Array.isArray(v)) {
    res.Arr = v;
    res.ID = undefined;
    res.Current = undefined;
    res.Next = function () {
      this.ID++;
      if (this.Arr.length > this.ID) {
        this.Current = this.Arr[this.ID];
        return true;
      }
      return false;
    };
    res.Reset = function () {
      this.ID = 0;
      if (this.Arr.length <= this.ID)
        return false;
      this.Current = this.Arr[0];
      return true;
    };
  }
  else if(v.Start !== undefined) {
    res.Start = v.Start;
    res.Step = v.Step;
    res.Count = v.Count;
    res.Iter = undefined;
    res.Current = undefined;
    res.Next = function () {
      this.Iter++;
      if (this.Iter >= this.Count)
        return false;
      this.Current += this.Step;
      return true;
    };
    res.Reset = function () {
      this.Iter = 0;
      if (this.Iter >= this.Count)
        return false;
      this.Current = this.Start;
      return true;
    };
  } else {
    res.Start = v;
    res.Count = 1;
    res.Iter = 0;
    res.Current = v;
    res.Next = function () {
      this.Iter++;
      if (this.Iter >= this.Count)
        return false;
      this.Current += this.Step;
      return true;
    };
    res.Reset = function () {
      this.Iter = 0;
      if (this.Iter >= this.Count)
        return false;
      this.Current = this.Start;
      return true;
    };
  }
  return res;
}

function GetArrayElement(Arr, index) {
  if (Arr === undefined)
    return undefined;
  if (!Array.isArray(Arr))
    return Arr;
  if (index >= Arr.length)
    index = Arr.length - 1;
  if (index >= 0)
    return Arr[index];
  return undefined;
}

function MakeSelectors() {
  SelectorsTemplate.forEach(function (el, id) {
    if (el.type == "matrix") {
      iX = GetIterator(el.X);
      iY = GetIterator(el.Y);
      ID = el.StartGroupID;
      RowID = 0;
      if (!iY.Reset())
        return;
      do {
        if (!iX.Reset())
          return;
        do {
          Selectors.push({
            X: iX.Current,
            Y: iY.Current,
            GroupID: ID++,
            ImageURI: GetArrayElement(el.Images, RowID),
            Width: GetArrayElement(el.Width, RowID),
            Height: GetArrayElement(el.Height, RowID),
            RootOffsetX: GetArrayElement(el.RootOffsetX, RowID),
            RootOffsetY: GetArrayElement(el.RootOffsetY, RowID),
            R: GetArrayElement(el.R, RowID)
          });
        } while (iX.Next());
        RowID++;
      }
      while (iY.Next());
    }
    else if (el.type == "vertical") {
      iY = GetIterator(el.Y);
      ID = el.StartGroupID;
      ElementID = 0;
      if (!iY.Reset())
        return;
      do {
        Selectors.push({
          X: el.X,
          Y: iY.Current,
          GroupID: ID++,
          ImageURI: GetArrayElement(el.Images, ElementID),
          Width: GetArrayElement(el.Width, ElementID),
          Height: GetArrayElement(el.Height, ElementID),
          RootOffsetX: GetArrayElement(el.RootOffsetX, ElementID),
          RootOffsetY: GetArrayElement(el.RootOffsetY, ElementID),
          R: GetArrayElement(el.R, ElementID)
        });
        ElementID++;
      }
      while (iY.Next());
    }
    else if (el.type == "horizontal") {
      iX = GetIterator(el.X);
      ID = el.StartGroupID;
      ElementID = 0;
      if (!iX.Reset())
        return;
      do {
        Selectors.push({
          X: iX.Current,
          Y: el.Y,
          GroupID: ID++,
          ImageURI: GetArrayElement(el.Images, ElementID),
          Width: GetArrayElement(el.Width, ElementID),
          Height: GetArrayElement(el.Height, ElementID),
          RootOffsetX: GetArrayElement(el.RootOffsetX, ElementID),
          RootOffsetY: GetArrayElement(el.RootOffsetY, ElementID),
          R: GetArrayElement(el.R, ElementID)
        });
        ElementID++;
      }
      while (iX.Next());
    }
  });
}

function MakeTests() {
  TestsTemplate.forEach(function (el, id) {
    if (el.type == "matrix") {
      iX = GetIterator(el.X);
      iY = GetIterator(el.Y);
      SID = GetIterator(el.SelID);
      ElementID = 0;
      if (!iY.Reset())
        return;
      if (!SID.Reset())
        return;
      do {
        if (!iX.Reset())
          return;
        do {
          Test.push({
            X: iX.Current,
            Y: iY.Current,
            Width: GetArrayElement(el.Width, ElementID),
            SelID: SID.Current,
            Text: GetArrayElement(el.Text, ElementID),
            R: GetArrayElement(el.R, ElementID),
            PlaySound: GetArrayElement(el.PlaySound, ElementID),
            Volume: GetArrayElement(el.Volume, ElementID)
          });
          SID.Next();
        } while (iX.Next());
        ElementID++;
      } while (iY.Next());
    }
    else if (el.type == "vertical") {
      iY = GetIterator(el.Y);
      SID = GetIterator(el.SelID);
      ElementID = 0;
      if (!iY.Reset())
        return;
      if (!SID.Reset())
        return;
      do {
        Test.push({
          X: el.X,
          Y: iY.Current,
          Width: GetArrayElement(el.Width, ElementID),
          SelID: SID.Current,
          Text: GetArrayElement(el.Text, ElementID),
          R: GetArrayElement(el.R, ElementID),
          PlaySound: GetArrayElement(el.PlaySound, ElementID),
          Volume: GetArrayElement(el.Volume, ElementID)
        });
        SID.Next();
        ElementID++;
      }
      while (iY.Next());
    }
    else if (el.type == "horizontal") {
      iX = GetIterator(el.X);
      SID = GetIterator(el.SelID);
      ElementID = 0;
      if (!iX.Reset())
        return;
      if (!SID.Reset())
        return;
      do {
        Test.push({
          X: iX.Current,
          Y: el.Y,
          Width: GetArrayElement(el.Width, ElementID),
          SelID: SID.Current,
          Text: GetArrayElement(el.Text, ElementID),
          R: GetArrayElement(el.R, ElementID),
          PlaySound: GetArrayElement(el.PlaySound, ElementID),
          Volume: GetArrayElement(el.Volume, ElementID)
        });
        SID.Next();
        ElementID++;
      }
      while (iX.Next());
    }
  });
}

function Init() {
  try {
    BeforeInit();
    var m = $(CanvasFilter);
    Canvas = m[0];
    DrawContext = Canvas.getContext("2d");
    if (Flags.ShowBackground) {
      if (BackgroundColor !== undefined) {
        Background = BackgroundColor;
      }
    }
    MakeSelectors();
    MakeTests();
    ConvertRelativeCoords();
    IsMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    //IsMobile = true;
    if (IsMobile) {
      m.bind('touchstart', function (e) {
        StartDrag(e.originalEvent.touches[0].pageX - this.offsetLeft, e.originalEvent.touches[0].pageY - this.offsetTop);
      });
      m.bind('touchmove', function (e) {
        Drag(e.originalEvent.touches[0].pageX - this.offsetLeft, e.originalEvent.touches[0].pageY - this.offsetTop);
        e.preventDefault();
        e.returnValue = false;
      });
      m.bind('touchend', function (e) {
        StopDrag(e.originalEvent.touches[0].pageX - this.offsetLeft, e.originalEvent.touches[0].pageY - this.offsetTop);
      });
    }
    else {
      if (Flags.AutoResize && Flags.AutoResizeForMobileDevicesOnly)
        Flags.AutoResize = false;
      m.mousedown(function (e) {
        StartDrag(e.pageX - this.offsetLeft, e.pageY - this.offsetTop);
      });
      m.mousemove(function (e) {
        Drag(e.pageX - this.offsetLeft, e.pageY - this.offsetTop);
      });
      m.mouseup(function (e) {
        StopDrag(e.pageX - this.offsetLeft, e.pageY - this.offsetTop);
      });
    }
    LocalLoader = function () { scope.loader(); };
    scope.TotalImages += StaticImages.length;
    for (i = 0; i < StaticImages.length; i++) {
      if (StaticImages[i].URL === undefined){
        scope.TotalImages--;
        continue;
      }
      StaticImages[i].Image = new Image();
      StaticImages[i].Image.src = StaticImages[i].URL;
      StaticImages[i].Image.onload = LocalLoader;
    }
    for (i = 0; i < Selectors.length; i++) {
      if (Selectors[i].ImageURI === undefined)
        continue;
      scope.TotalImages++;
      Selectors[i].Image = new Image();
      Selectors[i].Image.src = Selectors[i].ImageURI;
      Selectors[i].Image.onload = LocalLoader;
    }
    for (i = 0; i < Test.length; i++) {
      if (Test[i].PlaySound === undefined)
        continue;
      Dim = Test[i].PlaySound.substr(Test[i].PlaySound.length - 3).toLowerCase();
      if (Dim == "mp3")
        Dim = "audio/mpeg";
      else
        Dim = "audio/" + Dim;
      Test[i].AudioElement = $("<audio><source src=\"" + Test[i].PlaySound + "\" type=\"" + Dim + "\"></audio>");
      $(document.body).append(Test[i].AudioElement);
      Test[i].AudioElement = Test[i].AudioElement[0];
      Test[i].AudioElement.load();
      Test[i].AudioElement.muted = false;
      Test[i].AudioElement.volume = Test[i].Volume;
      Test[i].Played = false;
    }
    if (Flags.ShowPoweredBy)
      $("#DevBy").show();
    else
      $("#DevBy").hide();
    SaveDefaultSettings();
    
    // GAME ENGINE
    if (Flags.UseGameEngine === true)
      InitGameEngine();
    // EVENTS
    AfterInit();
    // paint
    scope.loader();
  }
  catch (Err) {
    LogFail(Err);
  }
}

function InitGameEngine() {
  BeforeGameInit();
  scope.StaticText = [];
  for(i=0;i<StaticText.length;i++){
    if (StaticText[i].Name !== undefined) {
      scope.StaticText[StaticText[i].Name] = StaticText[i];
    }
  }
  scope.StaticImages = [];
  for(i=0;i<StaticImages.length;i++){
    if (StaticImages[i].Name !== undefined) {
      scope.StaticImages[StaticImages[i].Name] = StaticImages[i];
    }
  }
  AfterGameInit();
  scope.Events.AddEvent(scope.Events.StandartEvents.Codes.Paint, 0);
}

function StartDrag(X, Y) {
  GetSelector(X, Y);
  if (SelectorID !== undefined) {
    if (SelectorID == -1)
      CheckStaticButtons(X, Y);
    //else
      //Timer = setInterval(Paint, UpdateDelay);
  }
}

function MoveGroup(X, Y) {
  if (GroupID == -1) {
    if (SelectorID != -1) {
      if (Selectors[SelectorID].StartPosition === undefined) {
        Selectors[SelectorID].StartPosition = {
          X: Selectors[SelectorID].X,
          Y: Selectors[SelectorID].Y
        };
      }
      Selectors[SelectorID].X = X;
      Selectors[SelectorID].Y = Y;
    }
  } else {
    OffsetX = X - Selectors[SelectorID].X;
    OffsetY = Y - Selectors[SelectorID].Y;
    for (i = 0; i < Selectors.length; i++) {
      if (Selectors[i].GroupID == GroupID) {
        if (Selectors[i].StartPosition === undefined) {
          Selectors[i].StartPosition = {
            X: Selectors[i].X,
            Y: Selectors[i].Y
          };
        }
        Selectors[i].X += OffsetX;
        Selectors[i].Y += OffsetY;
      }
    }
  }
}

function Drag(X, Y) {
  if (GroupID != -1) {
    MoveGroup(X, Y);
    scope.Events.AddEvent(scope.Events.StandartEvents.Codes.Paint, 0);
  }
  else if (SelectorID >= 0 && SelectorID < Selectors.length) {
    if (Selectors[SelectorID].StartPosition === undefined) {
      Selectors[SelectorID].StartPosition = {
        X: Selectors[SelectorID].X,
        Y: Selectors[SelectorID].Y
      };
    }
    Selectors[SelectorID].X = X;
    Selectors[SelectorID].Y = Y;
    scope.Events.AddEvent(scope.Events.StandartEvents.Codes.Paint, 0);
  }
}

function StopDragForce(X, Y) {
  SelectorID = -1;
  GroupID = -1;
}

function StopDrag(X, Y) {
  if(Flags.ResetAfterFailedTest){
    if (typeof PassedTests[SelectorID] === 'undefined'){
      Selectors[SelectorID].X = Selectors[SelectorID].StartPosition.X;
      Selectors[SelectorID].Y = Selectors[SelectorID].StartPosition.Y;
      scope.Events.AddEvent(scope.Events.StandartEvents.Codes.Paint, 0);
    }
  }
  SelectorID = -1;
  GroupID = -1;
}

function DrawText(Text, X, Y) {
  Text = String(Text);
  st = Text.indexOf('!', 0);
  if (st == -1 || st === undefined) {
    DrawContext.fillStyle = "black";
  }
  else {
    s = Text.substr(st + 1);
    if (s.length === 0)
      s = "blue";
    DrawContext.fillStyle = s;
    Text = Text.substr(0, st);
  }
  DrawContext.fillText(Text, X - TextSizeData * TextSizeScale * (Text.length - 1), Y);
}

function DrawHeader() {
  if (Header === Undefined)
    return;
  DrawContext.font = TextSizeMain + "px " + FontMain;
  for (i = 0; i < 6; i++)
    DrawText(6 - i, i * CellGridSize + OffsetHeader.X, OffsetHeader.Y);
  Y = OffsetHeader.Y + OffsetHeader.Z;
  X = OffsetHeader.X;
  var id = 0;
  DrawText(Header[id++], X, Y);
  X += CellGridSize;
  DrawText(Header[id++], X, Y);
  X += CellGridSize;
  DrawText(Header[id++], X, Y);
  X += CellGridSize;
  DrawText(Header[id++], X, Y);
  X += CellGridSize;
  DrawText(Header[id++], X, Y);
  X += CellGridSize;
  DrawText(Header[id++], X, Y);
}

function DrawCoords() {
  if (Data === undefined)
    return;
  X = OffsetData.X + 5;
  DrawContext.font = "9px Arial";
  DrawContext.fillStyle = "black";
  Y = OffsetGrid.Y + 10;
  for (i = 1; i <= Data.length; i++) {
    X = OffsetData.X + 5;
    for (j = 1; j <= 6; j++) {
      DrawContext.fillText("X:" + String(j) + " Y:" + String(i), X, Y);
      X += CellGridSize;
    }
    Y += CellGridSize;
  }
}

function DrawCells() {
  X = OffsetGrid.X;
  Y = OffsetGrid.Y;
  DrawContext.strokeStyle = "black";
  DrawContext.lineWidth = LinesWidth;
  // vertical
  for (i = 0; i < 6; i++) {
    DrawContext.beginPath();
    DrawContext.moveTo(X, Y - LinesWidth / 2);
    DrawContext.lineTo(X, Y + CellGridSize * Data.length + LinesWidth / 2);
    DrawContext.stroke();
    X += CellGridSize;
  }
  X = OffsetGrid.X;
  // horizontal
  for (i = 0; i <= Data.length; i++) {
    DrawContext.beginPath();
    DrawContext.moveTo(X - LinesWidth / 2, Y);
    DrawContext.lineTo(X + CellGridSize * 5 + LinesWidth / 2, Y);
    DrawContext.stroke();
    Y += CellGridSize;
  }
}

function DrawData() {
  X = OffsetData.X;
  DrawContext.font = TextSizeData + "px " + FontData;
  for (i = 0; i < 6; i++) {
    Y = OffsetData.Y;
    for (j = 0; j < Data.length; j++) {
      D = Data[j][i];
      if (D === undefined)
        D = "?";
      DrawContext.clearRect(X, Y - TextSizeData, TextSizeData, TextSizeData * 1.2);
      //DrawContext.fillText(D, X, Y);
      DrawText(D, X, Y);
      Y += CellGridSize;
    }
    X += CellGridSize;
  }
  if (Flags.ShowIndexes) {
    X -= CellGridSize * 0.2;
    Y = OffsetData.Y;
    for (i = 0; i < Data.length; i++) {
      DrawContext.fillText(i + 1, X, Y);
      Y += CellGridSize;
    }
  }
}

function DrawStaticImages() {
  for (i = 0; i < StaticImages.length; i++) {
    if (StaticImages[i].Image === undefined || StaticImages[i].Visible === false)
        continue;
    DrawContext.drawImage(StaticImages[i].Image, StaticImages[i].X, StaticImages[i].Y, StaticImages[i].Width, StaticImages[i].Height);
  }
}

function GetMaskValue(Mask) {
  id = Mask.substr(0, 3);
  data = Mask.substr(3);
  if (data === "")
    return undefined;
  data = Number(data);
  if (id == "trs") { // Test result of the selector. Data is an ID.
    if (data < 0 || data >= Selectors.length)
      return undefined;
    ts = Selectors[data].LastPassedTest;
    if (ts === undefined || ts < 0 || ts >= Test.length)
      return undefined;
    return Test[ts].Text;
  }
}

function ProccessText(Text, Hide) {
  if (Text.indexOf('%') == -1)
    return Text;
  id = 0;
  res = "";
  while (id < Text.length) {
    c = Text.charAt(id);
    if (c == '%') {
      c = Text.charAt(id + 1);
      if (c != '{') {
        res += c;
        id++;
      }
      else {
        id += 2;
        buf = "";
        c = Text.charAt(id++);
        while (c != '}') {
          buf += c;
          c = Text.charAt(id++);
        }
        r = GetMaskValue(buf);
        if (r === undefined) {
          if (Hide)
            return undefined;
          else
            r = "<unknown>";
        }
        res += r;
      }
    }
    else {
      res += c;
      id++;
    }
  }
  return res;
}

function DrawStaticText() {
  for (var o in StaticText) {
    txt = ProccessText(StaticText[o].Text, StaticText[o].HideIfDataIsUndefined);
    if (txt === undefined)
      continue;
    DrawContext.fillStyle = StaticText[o].Color;
    DrawContext.font = String(StaticText[o].TextSize) + "px " + StaticText[o].Font;
    DrawContext.fillText(txt, StaticText[o].X, StaticText[o].Y);
  }
}

function IsOver(obj, X, Y) {
  return (X <= obj.X + obj.Width) && (X >= obj.X) && (Y <= obj.Y + obj.Height) && (Y >= obj.Y);
}

function CheckStaticButtons(X, Y) {
  //LogFail({ stack: "X: " + X + "; Y: " + Y });
  for (var o in StaticImages) {
    if (StaticImages[o].Click === undefined)
      continue;
    if (IsOver(StaticImages[o], X, Y) && StaticImages[o].Visible !== false) {
      eval("CMD." + StaticImages[o].Click);
    }
  }
}

function DrawGame() {
  
}

function Paint() {
  try {
    if (PausePaint)
      return;
    if (Background !== undefined) {
      DrawContext.fillStyle = Background;
      DrawContext.fillRect(0, 0, Canvas.width, Canvas.height)
    } else {
      DrawContext.clearRect(0, 0, Canvas.width, Canvas.height);
    }
    if (Flags.ShowStaticImages)
      DrawStaticImages();
    if (Flags.ShowHeaders)
      DrawHeader();
    if (Flags.ShowLines)
      DrawCells();
    if (Flags.ShowData)
      DrawData();
    if (Flags.ShowCoords)
      DrawCoords();
    if (Flags.ShowStaticText)
      DrawStaticText();
    for (i = 0; i < Selectors.length; i++) {
      if (Selectors[i].Image !== undefined) {
        DrawContext.drawImage(Selectors[i].Image, Selectors[i].X - Selectors[i].RootOffsetX, Selectors[i].Y - Selectors[i].RootOffsetY, Selectors[i].Width, Selectors[i].Height);
      }
      else if (Selectors[i].Thickness === -1) {
        DrawContext.beginPath();
        DrawContext.fillStyle = Selectors[i].Color;
        DrawContext.arc(Selectors[i].X, Selectors[i].Y, Selectors[i].R, 0, 2 * Math.PI);
        DrawContext.fill();
      }
      else {
        DrawContext.beginPath();
        DrawContext.lineWidth = Selectors[i].Thickness;
        DrawContext.strokeStyle = Selectors[i].Color;
        DrawContext.arc(Selectors[i].X, Selectors[i].Y, Selectors[i].R, 0, 2 * Math.PI);
        DrawContext.stroke();
      }
    }
    if (Flags.UseGameEngine)
      DrawGame();
    CheckAnswer();
  }
  catch (Err) {
    LogFail(Err);
  }
}

function MessagesLoop() {
  scope.Updating = true;
  try {
    time = scope.GetTime();
    scope.Events.DoEvents();
    time = scope.GetTime() - time;
  }
  catch (Err) {
    LogFail(Err);
  }
  duration = UpdateDelay;
  if(Flags.ForceFramerate){
    console.log(time);
    if(time > duration)
      duration = 0;
    else
      duration -= time;
  }
  if (scope.Events.Queue.length > 0) {
    setTimeout(MessagesLoop, UpdateDelay);
  } else{
    scope.Updating = false;
    scope.PrevUpdateMark = undefined;
  }
}

function GetNum(X, Y) {
  X -= 10;
  Y -= 10;
  if (X >= 0 && Y >= 0 && (X % 100) < 60 && (Y % 100) < 60) {
    X = Math.floor(X / 100) + 1;
    Y = Math.floor(Y / 100);
    return Y * 5 + X;
  }
  return -1;
}

function GetDistance(X1, Y1, X2, Y2) {
  return Math.sqrt(Math.pow(X1 - X2, 2) + Math.pow(Y1 - Y2, 2));
}

function CheckAnswer() {
  for (i = 0; i < Test.length; i++) {
    if (typeof Test[i].Passed !== 'undefined' && Test[i].Passed === true)
      continue;
    SIDIterator = GetIterator(Test[i].SelID);
    SIDIterator.Reset();
    GID = 0;
    Passed = false;
    do {
      SID = SIDIterator.Current;
      GID = -1;
      if (SID >= Selectors.length)
        continue;
      if (Selectors[SID].GroupID !== undefined)
        GID = Selectors[SID].GroupID;
      if (GID != -1 && (PassedTests[GID] !==0 && PassedTests[GID] !== undefined))
        continue;
      StickCoords = { X: Test[i].X, Y: Test[i].Y };
      if (Test[i].Width !== undefined) {
        if (Selectors[SID].X < Test[i].X) {
          Passed = (GetDistance(Selectors[SID].X, Selectors[SID].Y, Test[i].X, Test[i].Y) <= Test[i].R);
        }
        else if (Selectors[SID].X > Test[i].X + Test[i].Width) {
          Passed = (GetDistance(Selectors[SID].X, Selectors[SID].Y, Test[i].X + Test[i].Width, Test[i].Y) <= Test[i].R);
          StickCoords.X = Test[i].X + Test[i].Width;
        }
        else {
          d = Math.abs(Selectors[SID].Y - Test[i].Y);
          Passed = (d <= Test[i].R);
          StickCoords.X = Selectors[SID].X;
        }
      }
      else
        Passed = (GetDistance(Selectors[SID].X, Selectors[SID].Y, Test[i].X, Test[i].Y) <= Test[i].R);
    } while (SIDIterator.Next() && Passed == false);
    if (Passed) {
      Test[i].Passed = true;
      if (Test[i].AudioElement !== undefined && (!Test[i].Played)) {
        Test[i].AudioElement.play();
        Test[i].Played = true;
      }
      if (Flags.AutoCorrect || Flags.FreezeCoordinates) {
        SelectorID = SID;
        Selectors[SID].LastPassedTest = i;
        MoveGroup(StickCoords.X, StickCoords.Y);
        StopDragForce();
        //if (Flags.FreezeCoordinates && GID != -1)
        PassedTests[GID] = 1;
        scope.Events.AddEvent(scope.Events.StandartEvents.Codes.Paint, 0);
      }
    }
    else {
      if (SID == SelectorID) {
        PassedTests[GID] = 0;
        Selectors[SID].LastPassedTest = -1;
      }
      if (PassedTests[GID] === 2)
        PassedTests[GID] = 0;
      Test[i].Played = false;
    }
  }
}

function Scale() {
  try {
    CMD.Control.ResetSelectorsMovement(scope);
    Canvas.width = SizeButtons.DefaultValues.Canvas.Width * SizeButtons.CurrentScale;
    Canvas.height = SizeButtons.DefaultValues.Canvas.Height * SizeButtons.CurrentScale;
    LinesWidth = SizeButtons.DefaultValues.LinesWidth * SizeButtons.CurrentScale;
    TextSizeMain = SizeButtons.DefaultValues.TextSizeMain * SizeButtons.CurrentScale;
    TextSizeData = SizeButtons.DefaultValues.TextSizeData * SizeButtons.CurrentScale;
    CellGridSize = SizeButtons.DefaultValues.CellGridSize * SizeButtons.CurrentScale;
    OffsetGlobal.X = SizeButtons.DefaultValues.OffsetGlobal.X * SizeButtons.CurrentScale;
    OffsetGlobal.Y = SizeButtons.DefaultValues.OffsetGlobal.Y * SizeButtons.CurrentScale;
    OffsetHeader.X = SizeButtons.DefaultValues.OffsetHeader.X * SizeButtons.CurrentScale;
    OffsetHeader.Y = SizeButtons.DefaultValues.OffsetHeader.Y * SizeButtons.CurrentScale;
    OffsetHeader.Z = SizeButtons.DefaultValues.OffsetHeader.Z * SizeButtons.CurrentScale;
    OffsetGrid.X = SizeButtons.DefaultValues.OffsetGrid.X * SizeButtons.CurrentScale;
    OffsetGrid.Y = SizeButtons.DefaultValues.OffsetGrid.Y * SizeButtons.CurrentScale;
    OffsetData.X = SizeButtons.DefaultValues.OffsetData.X * SizeButtons.CurrentScale;
    OffsetData.Y = SizeButtons.DefaultValues.OffsetData.Y * SizeButtons.CurrentScale;
    for (i = 0; i < Selectors.length; i++) {
      Selectors[i].X = SizeButtons.DefaultValues.Selectors[i].X * SizeButtons.CurrentScale;
      Selectors[i].Y = SizeButtons.DefaultValues.Selectors[i].Y * SizeButtons.CurrentScale;
      Selectors[i].LastPassedTest = -1;
      if (Selectors[i].R !== undefined) {
        Selectors[i].R = SizeButtons.DefaultValues.Selectors[i].R * SizeButtons.CurrentScale;
        Selectors[i].Width = SizeButtons.DefaultValues.Selectors[i].Width * SizeButtons.CurrentScale;
        Selectors[i].Height = SizeButtons.DefaultValues.Selectors[i].Height * SizeButtons.CurrentScale;
        Selectors[i].RootOffsetX = SizeButtons.DefaultValues.Selectors[i].RootOffsetX * SizeButtons.CurrentScale;
        Selectors[i].RootOffsetY = SizeButtons.DefaultValues.Selectors[i].RootOffsetY * SizeButtons.CurrentScale;
      }
    }
    for (i = 0; i < Test.length; i++) {
      Test[i].X = SizeButtons.DefaultValues.Test[i].X * SizeButtons.CurrentScale;
      Test[i].Y = SizeButtons.DefaultValues.Test[i].Y * SizeButtons.CurrentScale;
      Test[i].R = SizeButtons.DefaultValues.Test[i].R * SizeButtons.CurrentScale;
    }
    for (i = 0; i < StaticImages.length; i++) {
      StaticImages[i].X = SizeButtons.DefaultValues.StaticImages[i].X * SizeButtons.CurrentScale;
      StaticImages[i].Y = SizeButtons.DefaultValues.StaticImages[i].Y * SizeButtons.CurrentScale;
      StaticImages[i].Width = SizeButtons.DefaultValues.StaticImages[i].Width * SizeButtons.CurrentScale;
      StaticImages[i].Height = SizeButtons.DefaultValues.StaticImages[i].Height * SizeButtons.CurrentScale;
    }
    for (i = 0; i < StaticText.length; i++) {
      StaticText[i].X = SizeButtons.DefaultValues.StaticText[i].X * SizeButtons.CurrentScale;
      StaticText[i].Y = SizeButtons.DefaultValues.StaticText[i].Y * SizeButtons.CurrentScale;
      StaticText[i].TextSize = SizeButtons.DefaultValues.StaticText[i].TextSize * SizeButtons.CurrentScale;
    }
    if (Flags.UseGameEngine) {
      scope.Dices.Width *= SizeButtons.CurrentScale;
      scope.Dices.Height *= SizeButtons.CurrentScale;
    }
    AfterResize();
    scope.Events.AddEvent(scope.Events.StandartEvents.Codes.Paint, 0);
  }
  catch (Err) {
    LogFail(Err);
  }
}

function LogFail(Err) {
  if (Flags.ShowFailMessages)
    $(ErrorsOut).append(Err.stack + "<br/><br/>");
}

$(function () {
  try {
    Init();
    scope.Events.AddEvent(1, 25);
    scope.Events.AddEvent(1, 50);
    scope.Events.AddEvent(1, 100);
  }
  catch (Err) {
    LogFail(Err);
  }
});